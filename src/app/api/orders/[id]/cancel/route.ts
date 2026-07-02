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

    await db.runTransaction(async tx => {
      const items = (order.items ?? []) as Array<{ productId: string; quantity: number }>

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

      const invoiceSnap = await db.collection('invoices').where('orderId', '==', params.id).limit(1).get()
      if (!invoiceSnap.empty) {
        tx.update(invoiceSnap.docs[0].ref, {
          paid: false,
          paidAmountEgp: 0,
          remainingEgp: order.totalEgp ?? 0,
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
