import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'

export async function GET() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    return NextResponse.json({
      ok: false,
      error: 'GMAIL_USER أو GMAIL_APP_PASSWORD غير مضبوط على Vercel',
      hint: 'أضف GMAIL_USER و GMAIL_APP_PASSWORD في Vercel Environment Variables',
    })
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
    await transporter.sendMail({
      from: `"الركن الخليجي" <${user}>`,
      to: 'ezidan3@gmail.com',
      subject: 'اختبار إيميل الركن الخليجي ✅',
      html: '<div dir="rtl" style="font-family:Arial;padding:20px"><h2 style="color:#071f3d">الركن الخليجي</h2><p>الإيميل شغال بنجاح عبر Gmail ✅</p></div>',
    })
    return NextResponse.json({ ok: true, from: user, message: 'تم إرسال الإيميل التجريبي بنجاح' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message })
  }
}
