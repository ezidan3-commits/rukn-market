import { NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { PaymentMethod, PAYMENT_LABEL } from '@/lib/types'
import { sendOrderConfirmationEmail } from '@/lib/send-order-email'
import { sendAdminNewOrderNotification } from '@/lib/send-admin-notification'

function toFlutterPaymentMethod(method: PaymentMethod): string {
  if (method === 'vodafone_cash') return 'vodafoneCash'
  return method
}

export const runtime = 'nodejs'

type OrderRequestItem = {
  productId: string
  quantity: number
}

type OrderRequestBody = {
  customerName: string
  customerPhone: string
  city: string
  address: string
  notes?: string
  payment: PaymentMethod
  items: OrderRequestItem[]
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function generateOrderNumber() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = `${now.getHours()}`.padStart(2, '0') + `${now.getMinutes()}`.padStart(2, '0')
  const rand = Math.floor(Math.random() * 900 + 100)
  return `GM-${date}-${time}${rand}`
}

function validateBody(body: Partial<OrderRequestBody>) {
  const customerName = cleanText(body.customerName)
  const customerPhone = cleanText(body.customerPhone)
  const city = cleanText(body.city)
  const address = cleanText(body.address)
  const notes = cleanText(body.notes)
  const payment = body.payment

  if (!customerName) return { error: 'الاسم مطلوب' }
  if (!/^[0-9]{10,11}$/.test(customerPhone)) return { error: 'رقم هاتف غير صحيح' }
  if (!city) return { error: 'المدينة مطلوبة' }
  if (!address) return { error: 'العنوان مطلوب' }
  if (!payment || !PAYMENT_LABEL[payment]) return { error: 'طريقة الدفع غير صحيحة' }
  if (!Array.isArray(body.items) || body.items.length === 0) return { error: 'السلة فارغة' }

  const items = body.items.map(item => ({
    productId: cleanText(item?.productId),
    quantity: Number(item?.quantity),
  }))

  if (items.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 99)) {
    return { error: 'بيانات المنتجات غير صحيحة' }
  }

  return {
    value: {
      customerName,
      customerPhone,
      city,
      address,
      notes,
      payment,
      items,
    },
  }
}

export async function POST(request: Request) {
  try {
    const parsed = validateBody(await request.json())
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const data = parsed.value
    const adminDb = getAdminDb()

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً لإتمام الطلب' }, { status: 401 })
    }

    let customerUid: string
    let customerEmail: string | null = null
    try {
      const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7))
      if (decoded.firebase.sign_in_provider === 'anonymous') {
        return NextResponse.json({ error: 'يجب تسجيل الدخول بحساب حقيقي لإتمام الطلب' }, { status: 401 })
      }
      customerUid = decoded.uid
      customerEmail = decoded.email ?? null
    } catch {
      return NextResponse.json({ error: 'جلسة منتهية، سجّل الدخول مجدداً' }, { status: 401 })
    }

    try {
      const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000)
      const recentSnap = await adminDb.collection('orders')
        .where('customerPhone', '==', data.customerPhone)
        .where('createdAt', '>', fiveMinutesAgo)
        .limit(1)
        .get()
      if (!recentSnap.empty) {
        return NextResponse.json(
          { error: 'لقد أرسلت طلبًا مؤخرًا، يرجى الانتظار قليلًا قبل إرسال طلب جديد' },
          { status: 429 }
        )
      }
    } catch {
      // composite index not yet created — skip rate limit check silently
    }
    const orderNumber = generateOrderNumber()
    const orderRef = adminDb.collection('orders').doc()

    const result = await adminDb.runTransaction(async tx => {
      const productRefs = data.items.map(item => adminDb.collection('products').doc(item.productId))
      const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)))

      const flutterPaymentMethod = toFlutterPaymentMethod(data.payment)
      const orderItems = data.items.map((item, index) => {
        const snap = productSnaps[index]
        const product = snap.data()

        if (!snap.exists || !product?.visibleInMarket) {
          throw new Error('أحد المنتجات لم يعد متاحًا')
        }

        const available = Number(product.quantity ?? 0)
        if (available < item.quantity) {
          throw new Error(`المنتج "${product.name ?? item.productId}" لم يعد متاحًا بالكمية المطلوبة`)
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          discountValue: 0,
          discountType: 'amount',
          name: product.name ?? '',
          sellEgp: Number(product.sellEgp ?? 0),
        }
      })

      productRefs.forEach((ref, index) => {
        tx.update(ref, {
          quantity: FieldValue.increment(-data.items[index].quantity),
          updatedAt: FieldValue.serverTimestamp(),
        })
      })

      const totalEgp = orderItems.reduce((sum, item) => sum + item.sellEgp * item.quantity, 0)

      tx.set(orderRef, {
        orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        city: data.city,
        address: data.address,
        items: orderItems.map(({ productId, quantity, discountValue, discountType }) => ({
          productId,
          quantity,
          discountValue,
          discountType,
        })),
        marketItems: orderItems,
        totalEgp,
        status: 'newOrder',
        notes: data.notes,
        createdBy: 'ماركت - ' + data.customerName,
        createdAt: Timestamp.now(),
        isVip: false,
        trackingNumber: '',
        paymentMethod: flutterPaymentMethod,
        customerUid,
        ...(customerEmail ? { customerEmail } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      })

      const invoiceRef = adminDb.collection('invoices').doc()
      tx.set(invoiceRef, {
        orderId: orderRef.id,
        amountEgp: totalEgp,
        paid: false,
        paidAmountEgp: 0,
        remainingEgp: totalEgp,
        paymentMethod: flutterPaymentMethod,
        payments: [],
        createdAt: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      return {
        id: orderRef.id,
        orderNumber,
        items: orderItems,
        totalEgp,
      }
    })

    // Upsert marketing subscriber (silent — never blocks order creation)
    if (customerEmail) {
      try {
        await adminDb.collection('marketingSubscribers').doc(customerUid).set(
          {
            email: customerEmail,
            name: data.customerName,
            city: data.city,
            subscribedAt: new Date(),
            unsubscribed: false,
          },
          { merge: true }
        )
      } catch (err) {
        console.error('[Firestore] marketingSubscribers upsert failed:', err instanceof Error ? err.message : String(err))
      }
    }

    if (customerEmail) {
      try {
        await sendOrderConfirmationEmail({
          customerName: data.customerName,
          customerEmail,
          orderNumber: result.orderNumber,
          items: result.items,
          totalEgp: result.totalEgp,
          city: data.city,
          address: data.address,
          notes: data.notes,
          paymentMethod: toFlutterPaymentMethod(data.payment),
        })
      } catch (err) {
        console.error('[Gmail] order confirmation email failed:', err instanceof Error ? err.message : String(err))
      }
    }

    try {
      await sendAdminNewOrderNotification({
        orderNumber: result.orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        city: data.city,
        address: data.address,
        notes: data.notes,
        paymentMethod: toFlutterPaymentMethod(data.payment),
        items: result.items,
        totalEgp: result.totalEgp,
      })
    } catch (err) {
      console.error('[Gmail] admin new-order notification failed:', err instanceof Error ? err.message : String(err))
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الطلب'
    if (message.startsWith('Missing server environment variable')) {
      return NextResponse.json(
        { error: 'إعدادات الطلبات غير مكتملة على السيرفر. من فضلك تواصل مع إدارة المتجر.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
