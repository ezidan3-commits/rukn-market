import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { FieldPath, FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import { escapeHtml } from '@/lib/escape-html'
import { logServerError } from '@/lib/log-server-error'

export const runtime = 'nodejs'

function buildHtml(productName: string, productUrl: string, siteUrl: string): string {
  const name = escapeHtml(productName)
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EEE2;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,23,18,0.10);">
    <div style="background:#1B1712;padding:24px 32px;text-align:center;">
      <h1 style="color:#D97B2E;margin:0;font-size:20px;letter-spacing:1px;">الركن الخليجي</h1>
      <p style="color:#ffffff88;font-size:12px;margin:5px 0 0;">المنتج اللي كنت مستني رجع تاني</p>
    </div>
    <div style="padding:28px 32px;text-align:center;">
      <p style="font-size:34px;margin:0 0 10px;">🎉</p>
      <h2 style="color:#1B1712;font-size:19px;margin:0 0 16px;">${name} متاح الآن</h2>
      <a href="${productUrl}" style="display:inline-block;background:#D97B2E;color:#1B1712;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">
        اطلبه الآن ←
      </a>
    </div>
    <div style="background:#1B1712;padding:14px 32px;text-align:center;">
      <p style="color:#ffffff44;font-size:11px;margin:0;">© 2026 الركن الخليجي — جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`
}

// Runs on a schedule (see vercel.json) to notify customers who asked to be
// told when a sold-out product comes back. Protected by CRON_SECRET, which
// Vercel automatically sends as `Authorization: Bearer <CRON_SECRET>` for
// scheduled invocations once that env var is set on the project — same
// env-gated pattern already used by /api/staff/claim's X-Staff-Secret.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ sent: 0, message: 'إعدادات البريد غير مكتملة' })
  }

  const db = getAdminDb()
  const alertsSnap = await db.collection('stockAlerts').where('notified', '==', false).get()
  if (alertsSnap.empty) return NextResponse.json({ sent: 0 })

  const productIds = [...new Set(alertsSnap.docs.map(d => d.data().productId as string))]
  const inStockProductIds = new Set<string>()
  for (let i = 0; i < productIds.length; i += 30) {
    const chunk = productIds.slice(i, i + 30)
    const snap = await db.collection('products').where(FieldPath.documentId(), 'in', chunk).get()
    snap.docs.forEach(d => {
      if (Number(d.data().quantity ?? 0) > 0) inStockProductIds.add(d.id)
    })
  }
  if (inStockProductIds.size === 0) return NextResponse.json({ sent: 0 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rukn-market.vercel.app'
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  let sent = 0
  for (const doc of alertsSnap.docs) {
    const alert = doc.data() as { productId: string; productName?: string; email?: string }
    if (!inStockProductIds.has(alert.productId) || !alert.email) continue
    try {
      await transporter.sendMail({
        from: `"الركن الخليجي" <${process.env.GMAIL_USER}>`,
        to: alert.email,
        subject: `🎉 ${alert.productName ?? 'منتج'} متاح الآن — الركن الخليجي`,
        html: buildHtml(alert.productName ?? 'المنتج', `${siteUrl}/product/${alert.productId}`, siteUrl),
      })
      await doc.ref.update({ notified: true, notifiedAt: FieldValue.serverTimestamp() })
      sent++
    } catch (err) {
      await logServerError('cron/stock-alerts', err, { alertId: doc.id })
    }
  }

  return NextResponse.json({ sent, checked: alertsSnap.size })
}
