import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { logServerError } from '@/lib/log-server-error'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const rl = await checkRateLimit(`stock_alert_${getClientIp(request)}`, { limit: 20, windowSeconds: 300 })
    if (!rl.allowed) return NextResponse.json({ error: 'محاولات كثيرة جداً' }, { status: 429 })

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'سجل الدخول أولاً' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(token)
    if (decoded.firebase.sign_in_provider === 'anonymous' || !decoded.email) {
      return NextResponse.json({ error: 'سجل الدخول بحساب حقيقي أولاً' }, { status: 401 })
    }

    const body = await request.json() as { productId?: string }
    const productId = (body.productId ?? '').trim()
    if (!productId) return NextResponse.json({ error: 'منتج غير صالح' }, { status: 400 })

    const db = getAdminDb()
    const productSnap = await db.collection('products').doc(productId).get()
    if (!productSnap.exists) return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 404 })
    const product = productSnap.data()!
    if (Number(product.quantity ?? 0) > 0) {
      return NextResponse.json({ error: 'المنتج متاح بالفعل' }, { status: 400 })
    }

    // Deterministic ID (productId_uid) makes re-clicking idempotent instead
    // of piling up duplicate alert docs for the same person+product.
    const alertRef = db.collection('stockAlerts').doc(`${productId}_${decoded.uid}`)
    await alertRef.set({
      productId,
      productName: product.name ?? '',
      uid: decoded.uid,
      email: decoded.email,
      notified: false,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (err) {
    await logServerError('stock-alerts/subscribe', err)
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
