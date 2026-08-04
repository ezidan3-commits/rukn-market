import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

const requestLog = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30

function clientKey(request: Request, uid: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `${uid}:${forwarded ?? 'unknown'}`
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(key) ?? []).filter(at => now - at < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return true
  recent.push(now)
  requestLog.set(key, recent)
  if (requestLog.size > 5000) {
    requestLog.delete(requestLog.keys().next().value as string)
  }
  return false
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function GET() {
  try {
    const snap = await getAdminDb().collection('analytics').orderBy('cartAdds', 'desc').get()
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
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    console.error('[Analytics] read failed:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ ok: false }, { status: 401 })
    const decoded = await getAdminAuth().verifyIdToken(token)
    if (isRateLimited(clientKey(request, decoded.uid))) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }
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
