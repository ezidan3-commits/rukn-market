import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getAdminDb, getAdminStorageBucket } from '@/lib/firebase-admin'
import { escapeHtml } from '@/lib/escape-html'

export const runtime = 'nodejs'

interface DiscountAlertBody {
  productId: string
  productName: string
  imageUrl?: string
  imageBase64?: string
  originalPriceEgp: number
  discountPercent: number
}

function money(n: number): string {
  return Math.round(n).toLocaleString('ar-EG') + ' ج.م'
}

// Uploading from the server (Admin SDK, Node.js) instead of trusting the
// Flutter app's own Storage upload — that upload has proven unreliable on
// at least one platform, silently leaving imageUrl empty. The Admin SDK
// path here doesn't depend on that at all.
async function uploadImageAndGetUrl(productId: string, imageBase64: string): Promise<string | null> {
  try {
    const bucket = getAdminStorageBucket()
    const filePath = `products/${productId}_${Date.now()}.jpg`
    const file = bucket.file(filePath)
    await file.save(Buffer.from(imageBase64, 'base64'), {
      contentType: 'image/jpeg',
      resumable: false,
    })
    const [url] = await file.getSignedUrl({ action: 'read', expires: '01-01-2100' })
    return url
  } catch (err) {
    console.error('[discount-alert] image upload failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

function buildHtml(data: DiscountAlertBody, siteUrl: string): string {
  const discountedPrice = Math.round(data.originalPriceEgp * (1 - data.discountPercent / 100))
  const productUrl = `${siteUrl}/product/${data.productId}`
  const name = escapeHtml(data.productName)

  const imageSrc = data.imageUrl

  const imageBlock = imageSrc
    ? `<div style="position:relative;line-height:0;">
         <img src="${imageSrc}" alt="${name}" style="width:100%;display:block;max-height:380px;object-fit:cover;">
         <div style="position:absolute;top:14px;right:14px;background:#1B1712;color:#D97B2E;font-weight:bold;font-size:15px;padding:8px 16px 8px 12px;border-radius:8px 3px 3px 8px;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
           🔥 خصم ${data.discountPercent}٪
         </div>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EEE2;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(27,23,18,0.10);">

    <div style="background:#1B1712;padding:28px 32px;text-align:center;">
      <h1 style="color:#D97B2E;margin:0;font-size:22px;letter-spacing:1px;">الركن الخليجي</h1>
      <p style="color:#ffffff88;font-size:12px;margin:6px 0 0;">عرض خاص لفترة محدودة</p>
    </div>

    ${imageBlock}

    <div style="padding:28px 32px;text-align:center;">
      <h2 style="color:#1B1712;font-size:20px;margin:0 0 14px;">${name}</h2>

      <div style="display:inline-block;background:#F5EEE2;border-radius:12px;padding:14px 26px;margin-bottom:18px;">
        <span style="color:#a89a80;font-size:14px;text-decoration:line-through;margin-left:10px;">${money(data.originalPriceEgp)}</span>
        <span style="color:#D97B2E;font-size:22px;font-weight:bold;">${money(discountedPrice)}</span>
      </div>

      <p style="color:#555;font-size:14px;line-height:1.9;margin:0 0 22px;">
        العرض متاح الآن لفترة محدودة، والكمية محدودة أيضًا — اطلبه قبل ما ينفد.
      </p>

      <a href="${productUrl}" style="display:inline-block;background:#D97B2E;color:#1B1712;font-weight:bold;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">
        اطلب الآن ←
      </a>
    </div>

    <div style="background:#F5EEE2;padding:14px 32px;text-align:center;">
      <p style="color:#999;font-size:11px;margin:0;line-height:1.8;">
        وصلك هذا البريد لأنك سبق وطلبت من الركن الخليجي.<br>
        <a href="${siteUrl}/unsubscribe" style="color:#1B1712;">إلغاء الاشتراك فى العروض</a>
      </p>
    </div>

    <div style="background:#1B1712;padding:14px 32px;text-align:center;">
      <p style="color:#ffffff44;font-size:11px;margin:0;">© 2026 الركن الخليجي — جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  const key = request.headers.get('X-Marketing-Key')
  if (!key || key !== process.env.MARKETING_API_KEY) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: 'إعدادات البريد غير مكتملة' }, { status: 500 })
  }

  const body = await request.json() as Partial<DiscountAlertBody>
  const productId = body.productId?.trim()
  const productName = body.productName?.trim()
  const originalPriceEgp = Number(body.originalPriceEgp)
  const discountPercent = Number(body.discountPercent)

  if (!productId || !productName) {
    return NextResponse.json({ error: 'بيانات المنتج غير مكتملة' }, { status: 400 })
  }
  if (!Number.isFinite(originalPriceEgp) || originalPriceEgp <= 0) {
    return NextResponse.json({ error: 'سعر غير صحيح' }, { status: 400 })
  }
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
    return NextResponse.json({ error: 'نسبة خصم غير صحيحة' }, { status: 400 })
  }

  const db = getAdminDb()
  const snap = await db.collection('marketingSubscribers')
    .where('unsubscribed', '==', false)
    .select('email')
    .get()
  const uniqueEmails = [...new Set(
    snap.docs
      .map(d => (d.data().email as string | undefined)?.trim().toLowerCase())
      .filter((e): e is string => !!e)
  )]
  if (uniqueEmails.length === 0) {
    return NextResponse.json({ sent: 0, message: 'لا يوجد عملاء بإيميل لإرسال العرض إليهم' })
  }

  // Upload server-side (Admin SDK) rather than trust a URL the app might
  // send — its own upload has been unreliable, so prefer re-uploading the
  // bytes here whenever they're available.
  let imageUrl = body.imageUrl
  if (body.imageBase64) {
    imageUrl = (await uploadImageAndGetUrl(productId, body.imageBase64)) ?? imageUrl
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rukn-market.vercel.app'
  const html = buildHtml(
    {
      productId,
      productName,
      imageUrl,
      originalPriceEgp,
      discountPercent,
    },
    siteUrl
  )
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  const subject = `🔥 خصم ${discountPercent}٪ على ${productName} — الركن الخليجي`

  const batchSize = 50
  let sent = 0
  for (let i = 0; i < uniqueEmails.length; i += batchSize) {
    const batch = uniqueEmails.slice(i, i + batchSize)
    await transporter.sendMail({
      from: `"الركن الخليجي" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      bcc: batch,
      subject,
      html,
    })
    sent += batch.length
    if (i + batchSize < uniqueEmails.length) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  return NextResponse.json({ sent, total: uniqueEmails.length })
}
