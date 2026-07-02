import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export async function GET() {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev (default sandbox)'

  if (!key) {
    return NextResponse.json({ ok: false, error: 'RESEND_API_KEY not set' })
  }

  try {
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'الركن الخليجي <onboarding@resend.dev>',
      to: 'ezidan3@gmail.com',
      subject: 'اختبار إيميل الركن الخليجي',
      html: '<p dir="rtl">هذا إيميل تجريبي للتأكد من أن إعدادات Resend تعمل بشكل صحيح.</p>',
    })
    return NextResponse.json({ ok: true, from, resendResult: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, from, error: message })
  }
}
