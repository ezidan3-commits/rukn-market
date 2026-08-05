import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

const CANCELLABLE = ['newOrder', 'preparing']

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(token)
    if (decoded.firebase.sign_in_provider === 'anonymous') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const db = getAdminDb()
    const orderRef = db.collection('orders').doc(params.id)
    const orderSnap = await orderRef.get()

    if (!orderSnap.exists) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

    const order = orderSnap.data()!
    if (order.customerUid !== decoded.uid) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
    if (!CANCELLABLE.includes(order.status)) {
      return NextResponse.json({ error: 'لا يمكن إلغاء هذا الطلب في مرحلته الحالية' }, { status: 400 })
    }

    const invoiceQuery = await db.collection('invoices').where('orderId', '==', params.id).limit(1).get()
    const invoiceRef = invoiceQuery.empty ? null : invoiceQuery.docs[0].ref

    await db.runTransaction(async tx => {
      const freshOrderSnap = await tx.get(orderRef)
      if (!freshOrderSnap.exists) throw new Error('الطلب غير موجود')
      const freshOrder = freshOrderSnap.data()!
      if (freshOrder.customerUid !== decoded.uid) throw new Error('غير مصرح')
      if (!CANCELLABLE.includes(freshOrder.status)) throw new Error('لا يمكن إلغاء هذا الطلب في مرحلته الحالية')
      const invoiceSnap = invoiceRef ? await tx.get(invoiceRef) : null
      const items = (freshOrder.items ?? []) as Array<{ productId: string; quantity: number }>

      tx.update(orderRef, {
        status: 'cancelled',
        updatedAt: FieldValue.serverTimestamp(),
      })

      for (const item of items) {
        if (item.productId) {
          tx.update(db.collection('products').doc(item.productId), {
            quantity: FieldValue.increment(item.quantity),
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
      }

      // Match the Flutter app's own convention: cancelling an order deletes
      // its invoice if nothing has been paid on it yet. A partially/fully
      // paid invoice is left alone for staff to handle manually (refund).
      if (invoiceSnap?.exists) {
        const paidAmountEgp = Number(invoiceSnap.data()?.paidAmountEgp ?? 0)
        if (paidAmountEgp <= 0) {
          tx.delete(invoiceSnap.ref)
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
