import { NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import { PaymentMethod, PAYMENT_LABEL } from '@/lib/types'

export const runtime = 'nodejs'

type OrderRequestItem = {
  productId: string
  quantity: number
}

type OrderRequestBody = {
  customerName: string
  customerPhone: string
  city: string
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
  const notes = cleanText(body.notes)
  const payment = body.payment

  if (!customerName) return { error: 'الاسم مطلوب' }
  if (!/^[0-9]{10,11}$/.test(customerPhone)) return { error: 'رقم هاتف غير صحيح' }
  if (!city) return { error: 'المدينة مطلوبة' }
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
    const orderNumber = generateOrderNumber()
    const orderRef = adminDb.collection('orders').doc()

    const result = await adminDb.runTransaction(async tx => {
      const productRefs = data.items.map(item => adminDb.collection('products').doc(item.productId))
      const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)))

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
          discountType: 'fixed',
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

      tx.set(orderRef, {
        orderNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        city: data.city,
        items: orderItems.map(({ productId, quantity, discountValue, discountType }) => ({
          productId,
          quantity,
          discountValue,
          discountType,
        })),
        marketItems: orderItems,
        totalEgp: orderItems.reduce((sum, item) => sum + item.sellEgp * item.quantity, 0),
        status: 'newOrder',
        notes: data.notes,
        createdBy: 'ماركت - ' + data.customerName,
        createdAt: Timestamp.now(),
        isVip: false,
        trackingNumber: '',
        paymentMethod: data.payment,
        updatedAt: FieldValue.serverTimestamp(),
      })

      return {
        id: orderRef.id,
        orderNumber,
        items: orderItems,
        totalEgp: orderItems.reduce((sum, item) => sum + item.sellEgp * item.quantity, 0),
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الطلب'
    const status = message.startsWith('Missing server environment variable') ? 500 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
