import nodemailer from 'nodemailer'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

interface OrderEmailData {
  customerName: string
  customerEmail: string
  orderNumber: string
  items: Array<{ name: string; quantity: number; sellEgp: number }>
  totalEgp: number
  city: string
  address: string
  notes?: string
  paymentMethod: string
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'الدفع عند الاستلام',
  vodafoneCash: 'فودافون كاش',
  instapay: 'إنستاباي',
}

function formatMoney(n: number) {
  return n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

function buildHtml(data: OrderEmailData): string {
  const itemsRows = data.items.map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e8d0;color:#071f3d;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e8d0;text-align:center;color:#071f3d;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e8d0;text-align:left;color:#071f3d;font-weight:bold;">${formatMoney(item.sellEgp * item.quantity)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(7,31,61,0.10);">

    <div style="background:#071f3d;padding:28px 32px;text-align:center;">
      <h1 style="color:#C9A84C;margin:0;font-size:22px;letter-spacing:1px;">الركن الخليجي</h1>
      <p style="color:#ffffff99;margin:6px 0 0;font-size:13px;">تأكيد استلام طلبك</p>
    </div>

    <div style="padding:28px 32px;">
      <p style="color:#071f3d;font-size:16px;margin:0 0 8px;">مرحباً <strong>${data.customerName}</strong>،</p>
      <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
        شكراً لك على طلبك من الركن الخليجي! تم استلام طلبك بنجاح وسيتم التواصل معك قريباً لتأكيد التفاصيل وترتيب التوصيل.
      </p>

      <div style="background:#f5f0e8;border-radius:10px;padding:16px 20px;margin-bottom:24px;text-align:center;">
        <p style="color:#888;font-size:12px;margin:0 0 4px;">رقم الطلب</p>
        <p style="color:#071f3d;font-size:18px;font-weight:bold;font-family:monospace;margin:0;">${data.orderNumber}</p>
      </div>

      <p style="color:#071f3d;font-weight:bold;margin:0 0 10px;font-size:14px;">المنتجات:</p>
      <table width="100%" style="border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#071f3d;">
            <th style="padding:10px 12px;color:#C9A84C;text-align:right;font-size:13px;">المنتج</th>
            <th style="padding:10px 12px;color:#C9A84C;text-align:center;font-size:13px;">الكمية</th>
            <th style="padding:10px 12px;color:#C9A84C;text-align:left;font-size:13px;">السعر</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <div style="display:flex;justify-content:space-between;border-top:2px solid #C9A84C;padding-top:12px;margin-bottom:24px;">
        <span style="color:#071f3d;font-weight:bold;font-size:15px;">الإجمالي</span>
        <span style="color:#C9A84C;font-weight:bold;font-size:18px;">${formatMoney(data.totalEgp)}</span>
      </div>

      <div style="background:#f9f6f0;border-radius:10px;padding:16px 20px;font-size:13px;color:#444;line-height:1.9;">
        <div><strong style="color:#071f3d;">المدينة:</strong> ${data.city}</div>
        <div><strong style="color:#071f3d;">العنوان:</strong> ${data.address}</div>
        <div><strong style="color:#071f3d;">الدفع:</strong> ${PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}</div>
        ${data.notes ? `<div><strong style="color:#071f3d;">ملاحظات:</strong> ${data.notes}</div>` : ''}
      </div>

      <p style="color:#888;font-size:12px;margin:24px 0 0;text-align:center;line-height:1.7;">
        إذا كان لديك أي استفسار، تواصل معنا عبر واتساب.<br>
        شكراً لثقتك في الركن الخليجي 🌟
      </p>
    </div>

    <div style="background:#071f3d;padding:16px 32px;text-align:center;">
      <p style="color:#ffffff55;font-size:11px;margin:0;">© 2026 الركن الخليجي — جميع الحقوق محفوظة</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"الركن الخليجي" <${process.env.GMAIL_USER}>`,
    to: data.customerEmail,
    subject: `تأكيد طلبك ${data.orderNumber} — الركن الخليجي`,
    html: buildHtml(data),
  })
}
