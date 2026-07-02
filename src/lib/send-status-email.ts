import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface StatusEmailData {
  customerName: string
  customerEmail: string
  orderNumber: string
  status: string
}

const STATUS_CONFIG: Record<string, { label: string; detail: string; color: string; emoji: string }> = {
  preparing:    { label: 'طلبك قيد التحضير',    detail: 'يتم حالياً تجهيز طلبك وسيكون جاهزاً للشحن قريباً.',        color: '#D97706', emoji: '🔄' },
  readyToShip:  { label: 'طلبك جاهز للشحن',     detail: 'تم تجهيز طلبك بالكامل وسيتم إرساله إليك قريباً.',          color: '#7C3AED', emoji: '📦' },
  shipped:      { label: 'تم شحن طلبك',          detail: 'طلبك في الطريق إليك! سنتواصل معك عند الوصول.',             color: '#0891B2', emoji: '🚚' },
  delivered:    { label: 'تم توصيل طلبك',        detail: 'وصل طلبك بنجاح! نشكرك على ثقتك في الركن الخليجي.',        color: '#16A34A', emoji: '✅' },
  cancelled:    { label: 'تم إلغاء طلبك',        detail: 'نأسف لإبلاغك بأنه تم إلغاء طلبك. للاستفسار تواصل معنا.', color: '#DC2626', emoji: '❌' },
}

function buildHtml(data: StatusEmailData, cfg: typeof STATUS_CONFIG[string]): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(7,31,61,0.10);">

    <!-- Header -->
    <div style="background:#071f3d;padding:24px 32px;text-align:center;">
      <h1 style="color:#C9A84C;margin:0;font-size:20px;letter-spacing:1px;">الركن الخليجي</h1>
      <p style="color:#ffffff99;margin:5px 0 0;font-size:12px;">تحديث حالة طلبك</p>
    </div>

    <!-- Status badge -->
    <div style="background:${cfg.color}18;border-top:4px solid ${cfg.color};padding:24px 32px;text-align:center;">
      <p style="font-size:36px;margin:0 0 8px;">${cfg.emoji}</p>
      <h2 style="color:${cfg.color};margin:0;font-size:20px;font-weight:900;">${cfg.label}</h2>
    </div>

    <!-- Body -->
    <div style="padding:24px 32px;">
      <p style="color:#071f3d;font-size:16px;margin:0 0 8px;">مرحباً <strong>${data.customerName}</strong>،</p>
      <p style="color:#555;font-size:14px;line-height:1.8;margin:0 0 20px;">${cfg.detail}</p>

      <div style="background:#f5f0e8;border-radius:10px;padding:14px 20px;text-align:center;">
        <p style="color:#888;font-size:11px;margin:0 0 4px;">رقم الطلب</p>
        <p style="color:#071f3d;font-size:16px;font-weight:bold;font-family:monospace;margin:0;">${data.orderNumber}</p>
      </div>

      <p style="color:#888;font-size:12px;margin:20px 0 0;text-align:center;line-height:1.7;">
        إذا كان لديك أي استفسار، تواصل معنا عبر واتساب.<br>
        شكراً لثقتك في الركن الخليجي 🌟
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#071f3d;padding:14px 32px;text-align:center;">
      <p style="color:#ffffff55;font-size:11px;margin:0;">© 2025 الركن الخليجي — جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendStatusEmail(data: StatusEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const cfg = STATUS_CONFIG[data.status]
  if (!cfg) return

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'الركن الخليجي <onboarding@resend.dev>',
    to: data.customerEmail,
    subject: `${cfg.emoji} ${cfg.label} — طلب ${data.orderNumber}`,
    html: buildHtml(data, cfg),
  })
}
