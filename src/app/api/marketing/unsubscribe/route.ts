import { NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'سجل الدخول أولاً' }, { status: 401 })

  let email = ''
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    email = decoded.email?.trim().toLowerCase() ?? ''
  } catch {
    return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'بريد إلكتروني غير صحيح' }, { status: 400 })
  }

  const db = getAdminDb()
  const snap = await db.collection('marketingSubscribers').where('email', '==', email).get()
  if (snap.empty) {
    return NextResponse.json(
      { error: 'لم يتم العثور على هذا البريد في قائمة المشتركين' },
      { status: 404 }
    )
  }

  const batch = db.batch()
  for (const doc of snap.docs) {
    batch.update(doc.ref, { unsubscribed: true })
  }
  await batch.commit()

  return NextResponse.json({ ok: true })
}
