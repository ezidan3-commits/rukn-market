import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function GET() {
  try {
    const snap = await getAdminDb().collection('analytics').orderBy('views', 'desc').get()
    const items = snap.docs.map(doc => {
      const data = doc.data()
      return {
        productId: cleanString(data.productId, 200) || doc.id,
        productName: cleanString(data.productName, 300),
        views: Number(data.views) || 0,
        cartAdds: Number(data.cartAdds) || 0,
        lastSeenAt: data.lastSeenAt?.toDate?.()?.toISOString() ?? null,
      }
    })
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[Analytics] read failed:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    const { productId, productName, event } = await request.json()
    const cleanProductId = cleanString(productId, 200)
    const cleanProductName = cleanString(productName, 300)

    if (!cleanProductId || !['view', 'cart_add'].includes(event)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const adminDb = getAdminDb()
    const ref = adminDb.collection('analytics').doc(cleanProductId)
    await ref.set(
      {
        productId: cleanProductId,
        productName: cleanProductName,
        views: event === 'view' ? FieldValue.increment(1) : FieldValue.increment(0),
        cartAdds: event === 'cart_add' ? FieldValue.increment(1) : FieldValue.increment(0),
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Analytics] write failed:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
