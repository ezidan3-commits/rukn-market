import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// Public order-tracking lookup. No auth required by design — a guest who
// never created an account still needs to track an order via WhatsApp.
// Firestore's client-side security rules only allow a signed-in customer to
// read their OWN orders (or staff to read any order), so the /track page
// cannot query Firestore directly as an anonymous session. This route uses
// the Admin SDK to look the order up server-side and only returns it after
// verifying the phone number matches, then hands back a curated subset of
// fields — never the full document (no customerUid, customerEmail, phone).
export async function POST(request: Request) {
  try {
    const rl = await checkRateLimit(`track_${getClientIp(request)}`, { limit: 10, windowSeconds: 300 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'محاولات كثيرة جداً، حاول بعد قليل' },
        { status: 429, headers: rl.retryAfterSeconds ? { 'Retry-After': String(rl.retryAfterSeconds) } : {} }
      )
    }

    const body = await request.json() as { orderNumber?: string; phone?: string }
    const rawOrderNumber = (body.orderNumber ?? '').trim()
    const orderNumber = rawOrderNumber.toUpperCase()
    const phone = (body.phone ?? '').trim()

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الطلب ورقم الهاتف' }, { status: 400 })
    }

    const db = getAdminDb()
    let doc = (await db.collection('orders').where('orderNumber', '==', orderNumber).limit(1).get()).docs[0]

    // Fallback: allow searching by raw document ID too, same as before.
    // Firestore auto-IDs are case-sensitive mixed-case strings, so this must
    // use the original casing — never the uppercased orderNumber above.
    if (!doc) {
      const byId = await db.collection('orders').doc(rawOrderNumber).get()
      if (byId.exists) doc = byId as FirebaseFirestore.QueryDocumentSnapshot
    }

    if (!doc || !doc.exists) {
      return NextResponse.json({ result: 'not_found' })
    }

    const order = doc.data()!
    if (order.customerPhone !== phone) {
      // Same response as "not found" — never confirm an order number is
      // real to someone who doesn't also know the phone on it.
      return NextResponse.json({ result: 'not_found' })
    }

    return NextResponse.json({
      result: 'found',
      order: {
        id: doc.id,
        orderNumber: order.orderNumber ?? '',
        status: order.status ?? '',
        totalEgp: order.totalEgp ?? 0,
        // Normalize to {seconds} — an Admin SDK Timestamp JSON-serializes as
        // {_seconds, _nanoseconds}, which the client's `.seconds` read would
        // silently see as undefined and render an empty date.
        createdAt: order.createdAt instanceof Timestamp
          ? { seconds: order.createdAt.seconds }
          : null,
        customerName: order.customerName ?? '',
        city: order.city ?? '',
        trackingNumber: order.trackingNumber ?? '',
        notes: order.notes ?? '',
        marketItems: order.marketItems ?? [],
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
