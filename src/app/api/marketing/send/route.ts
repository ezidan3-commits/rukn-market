import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getAdminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

interface CampaignBody {
  subject: string
  body: string
  imageUrl?: string
  cityFilter?: string
}

function buildHtml(subject: string, body: string, imageUrl?: string, gmailUser?: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(7,31,61,0.10);">

    <div style="background:#071f3d;padding:28px 32px;text-align:center;">
      <h1 style="color:#C9A84C;margin:0;font-size:22px;letter-spacing:1px;">الركن الخليجي</h1>
      <p style="color:#ffffff88;font-size:12px;margin:6px 0 0;">عروض ومنتجات حصرية</p>
    </div>

    ${imageUrl ? `<img src="${imageUrl}" alt="صورة العرض" style="width:100%;display:block;max-height:420px;object-fit:cover;">` : ''}

    <div style="padding:28px 32px;">
      <h2 style="color:#071f3d;font-size:20px;margin:0 0 16px;border-right:4px solid #C9A84C;padding-right:12px;">${subject}</h2>
      <div style="color:#444;font-size:15px;line-height:2;white-space:pre-wrap;">${body}</div>
    </div>

    <div style="background:#f5f0e8;padding:14px 32px;text-align:center;">
      <p style="color:#999;font-size:11px;margin:0;line-height:1.8;">
        وصلك هذا البريد لأنك سبق وطلبت من الركن الخليجي.<br>
        للإلغاء الاشتراك راسلنا على
        <a href="mailto:${gmailUser ?? ''}?subject=إلغاء_الاشتراك" style="color:#071f3d;">هذا الإيميل</a>
      </p>
    </div>

    <div style="background:#071f3d;padding:14px 32px;text-align:center;">
      <p style="color:#ffffff44;font-size:11px;margin:0;">© 2026 الركن الخليجي — جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  // Verify API key
  const key = request.headers.get('X-Marketing-Key')
  if (!key || key !== process.env.MARKETING_API_KEY) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: 'إعدادات البريد غير مكتملة' }, { status: 500 })
  }

  const body = await request.json() as CampaignBody
  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'الموضوع والرسالة مطلوبان' }, { status: 400 })
  }

  // Collect unique customer emails from orders
  const db = getAdminDb()
  const snap = await db.collection('orders')
    .where('customerEmail', '!=', null)
    .select('customerEmail', 'city')
    .get()

  const emailSet = new Set<string>()
  for (const doc of snap.docs) {
    const data = doc.data()
    const email = (data.customerEmail as string | undefined)?.trim().toLowerCase()
    if (!email) continue
    if (body.cityFilter && body.cityFilter !== 'all' && data.city !== body.cityFilter) continue
    emailSet.add(email)
  }

  const emails = [...emailSet]
  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, message: 'لا يوجد عملاء بإيميل لإرسال الحملة إليهم' })
  }

  const html = buildHtml(body.subject, body.body, body.imageUrl, process.env.GMAIL_USER)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  // Send in BCC batches of 50
  const batchSize = 50
  let sent = 0
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    await transporter.sendMail({
      from: `"الركن الخليجي" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      bcc: batch,
      subject: body.subject,
      html,
    })
    sent += batch.length
    if (i + batchSize < emails.length) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  return NextResponse.json({ sent, total: emails.length })
}
