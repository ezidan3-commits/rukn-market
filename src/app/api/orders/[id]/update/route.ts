import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { sendAdminUpdateInfoNotification } from '@/lib/send-admin-notification'

export const runtime = 'nodejs'

const EDITABLE = ['newOrder', 'preparing']

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(token)
    if (decoded.firebase.sign_in_provider === 'anonymous') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json() as { address?: string; notes?: string }
    const address = body.address?.trim()
    const notes = body.notes?.trim() ?? ''

    if (!address) return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 })

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

    await orderRef.update({
      address,
      notes,
      updatedAt: FieldValue.serverTimestamp(),
    })

    try {
      await sendAdminUpdateInfoNotification({
        orderId: params.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName ?? '',
        customerPhone: order.customerPhone ?? '',
        city: order.city ?? '',
        newAddress: address,
        newNotes: notes,
      })
    } catch (err) {
      console.error('[Gmail] admin update-info notification failed:', err instanceof Error ? err.message : String(err))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
