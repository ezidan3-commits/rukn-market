import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { productId, productName, event } = await request.json()
    if (!productId || !['view', 'cart_add'].includes(event)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const ref = adminDb.collection('analytics').doc(productId)
    await ref.set(
      {
        productId,
        productName: productName ?? '',
        views: event === 'view' ? FieldValue.increment(1) : FieldValue.increment(0),
        cartAdds: event === 'cart_add' ? FieldValue.increment(1) : FieldValue.increment(0),
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
