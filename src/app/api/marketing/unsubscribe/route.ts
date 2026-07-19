import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json() as { email?: string }
  const email = body.email?.trim().toLowerCase()

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
