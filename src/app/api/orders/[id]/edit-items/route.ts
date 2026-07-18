import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { sendAdminEditItemsNotification } from '@/lib/send-admin-notification'

export const runtime = 'nodejs'

const EDITABLE = ['newOrder', 'preparing']

function effectiveSellEgp(product: FirebaseFirestore.DocumentData): number {
  const sellEgp = Number(product.sellEgp ?? 0)
  const pct = Number(product.discountPercent ?? 0)
  if (product.discountActive && pct > 0) {
    return Math.round(sellEgp * (1 - Math.min(pct, 100) / 100))
  }
  return sellEgp
}

type NewItem = { productId: string; quantity: number }

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(token)
    if (decoded.firebase.sign_in_provider === 'anonymous') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json() as { items: NewItem[] }
    const newItems = body.items ?? []

    if (newItems.length === 0) {
      return NextResponse.json({ error: 'لا يمكن حذف جميع المنتجات، قم بإلغاء الطلب بدلاً من ذلك' }, { status: 400 })
    }
    if (newItems.some(i => !i.productId || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 99)) {
      return NextResponse.json({ error: 'بيانات المنتجات غير صحيحة' }, { status: 400 })
    }

    const db = getAdminDb()
    const orderRef = db.collection('orders').doc(params.id)
    const orderSnap = await orderRef.get()

    if (!orderSnap.exists) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

    const order = orderSnap.data()!
    if (order.customerUid !== decoded.uid) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
    if (!EDITABLE.includes(order.status)) {
      return NextResponse.json({ error: 'لا يمكن تعديل هذا الطلب في مرحلته الحالية' }, { status: 400 })
    }

    const oldItems = (order.items ?? []) as Array<{ productId: string; quantity: number }>

    // Collect all product IDs needed (old + new, deduplicated)
    const allProductIds = [...new Set([
      ...oldItems.map(i => i.productId),
      ...newItems.map(i => i.productId),
    ])]

    let committedItems: Array<{ name: string; quantity: number; sellEgp: number }> = []
    let committedTotal = 0

    await db.runTransaction(async tx => {
      const productRefs = allProductIds.map(id => db.collection('products').doc(id))
      const productSnaps = await Promise.all(productRefs.map(r => tx.get(r)))
      const productMap = Object.fromEntries(
        productSnaps.map((snap, i) => [allProductIds[i], snap])
      )

      // Validate new items
      for (const item of newItems) {
        const snap = productMap[item.productId]
        if (!snap?.exists || !snap.data()?.visibleInMarket) {
          throw new Error(`أحد المنتجات لم يعد متاحاً`)
        }

        // Calculate available stock = current + what we'll restore from old order
        const currentQty = Number(snap.data()?.quantity ?? 0)
        const oldQty = oldItems.find(o => o.productId === item.productId)?.quantity ?? 0
        const available = currentQty + oldQty

        if (available < item.quantity) {
          throw new Error(`المنتج "${snap.data()?.name}" غير متاح بالكمية المطلوبة (المتاح: ${available})`)
        }
      }

      // Restore old quantities
      for (const old of oldItems) {
        tx.update(db.collection('products').doc(old.productId), {
          quantity: FieldValue.increment(old.quantity),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      // Deduct new quantities and build order items
      const newOrderItems = newItems.map(item => {
        const snap = productMap[item.productId]
        const product = snap.data()!
        tx.update(db.collection('products').doc(item.productId), {
          quantity: FieldValue.increment(-item.quantity),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return {
          productId: item.productId,
          quantity: item.quantity,
          discountValue: 0,
          discountType: 'amount',
          name: product.name ?? '',
          sellEgp: effectiveSellEgp(product),
        }
      })

      const newTotal = newOrderItems.reduce((s, i) => s + i.sellEgp * i.quantity, 0)
      committedItems = newOrderItems.map(i => ({ name: i.name, quantity: i.quantity, sellEgp: i.sellEgp }))
      committedTotal = newTotal

      tx.update(orderRef, {
        items: newOrderItems.map(({ productId, quantity, discountValue, discountType }) => ({
          productId, quantity, discountValue, discountType,
        })),
        marketItems: newOrderItems,
        totalEgp: newTotal,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Update invoice — preserve any payments already made
      const invoiceSnap = await db.collection('invoices').where('orderId', '==', params.id).limit(1).get()
      if (!invoiceSnap.empty) {
        const paidSoFar = Number(invoiceSnap.docs[0].data().paidAmountEgp ?? 0)
        tx.update(invoiceSnap.docs[0].ref, {
          amountEgp: newTotal,
          remainingEgp: Math.max(0, newTotal - paidSoFar),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    })

    try {
      await sendAdminEditItemsNotification({
        orderId: params.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName ?? '',
        customerPhone: order.customerPhone ?? '',
        city: order.city ?? '',
        newItems: committedItems,
        newTotalEgp: committedTotal,
      })
    } catch (err) {
      console.error('[Gmail] admin edit-items notification failed:', err instanceof Error ? err.message : String(err))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
