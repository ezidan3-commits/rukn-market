import { NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { sendStatusEmail } from '@/lib/send-status-email'

export const runtime = 'nodejs'

const NOTIFY_STATUSES = ['preparing', 'readyToShip', 'shipped', 'delivered', 'cancelled']

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // Staff (Flutter app) authenticate anonymously — this endpoint is staff-only,
    // so anonymous is required and a real customer account must be rejected.
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(token)
    if (decoded.firebase.sign_in_provider !== 'anonymous') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { status?: string }
    const status = body.status ?? ''

    if (!NOTIFY_STATUSES.includes(status)) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const db = getAdminDb()
    const orderSnap = await db.collection('orders').doc(params.id).get()
    if (!orderSnap.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const order = orderSnap.data()!
    const customerUid = order.customerUid as string | undefined
    if (!customerUid) return NextResponse.json({ ok: true, skipped: true })

    // Get customer email from Firebase Auth
    let customerEmail: string | null = null
    const customerName: string = order.customerName ?? ''
    try {
      const authUser = await getAdminAuth().getUser(customerUid)
      customerEmail = authUser.email ?? null
    } catch { /* user deleted or not found */ }

    if (!customerEmail) return NextResponse.json({ ok: true, skipped: true })

    await sendStatusEmail({
      customerName,
      customerEmail,
      orderNumber: order.orderNumber ?? params.id,
      status,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('notify-status error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
