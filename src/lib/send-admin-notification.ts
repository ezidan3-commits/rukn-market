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

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAILS ?? ''
  return raw.split(',').map(e => e.trim()).filter(Boolean)
}

function formatMoney(n: number) {
  return n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

function formatDate() {
  return new Date().toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── New Order ────────────────────────────────────────────────────────────────

export interface NewOrderNotifData {
  orderNumber: string
  customerName: string
  customerPhone: string
  city: string
  address: string
  notes?: string
  paymentMethod: string
  items: Array<{ name: string; quantity: number; sellEgp: number }>
  totalEgp: number
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'الدفع عند الاستلام',
  vodafoneCash: 'فودافون كاش',
  instapay: 'إنستاباي',
}

export async function sendAdminNewOrderNotification(data: NewOrderNotifData) {
  const admins = getAdminEmails()
  if (!admins.length || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const itemsRows = data.items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b;">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#1e293b;">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:left;color:#1e293b;font-weight:600;">${formatMoney(i.sellEgp * i.quantity)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#071f3d;padding:20px 28px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:28px;">🆕</span>
      <div>
        <div style="color:#C9A84C;font-size:18px;font-weight:bold;">طلب جديد — الركن الخليجي</div>
        <div style="color:#ffffff88;font-size:12px;margin-top:2px;">${formatDate()}</div>
      </div>
    </div>
    <div style="padding:24px 28px;">
      <div style="background:#f0f9ff;border-right:4px solid #0ea5e9;padding:12px 16px;border-radius:8px;margin-bottom:20px;">
        <div style="color:#0369a1;font-size:13px;margin-bottom:4px;">رقم الطلب</div>
        <div style="color:#0c4a6e;font-size:20px;font-weight:bold;font-family:monospace;">${data.orderNumber}</div>
      </div>
      <table width="100%" style="border-collapse:collapse;margin-bottom:8px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:120px;">العميل</td><td style="padding:6px 0;color:#1e293b;font-weight:600;">${data.customerName}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">الهاتف</td><td style="padding:6px 0;color:#1e293b;">${data.customerPhone}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">المدينة</td><td style="padding:6px 0;color:#1e293b;">${data.city}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">العنوان</td><td style="padding:6px 0;color:#1e293b;">${data.address}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">الدفع</td><td style="padding:6px 0;color:#1e293b;">${PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}</td></tr>
        ${data.notes ? `<tr><td style="padding:6px 0;color:#64748b;">ملاحظات</td><td style="padding:6px 0;color:#dc2626;">${data.notes}</td></tr>` : ''}
      </table>
      <div style="margin-top:20px;">
        <div style="color:#1e293b;font-weight:bold;margin-bottom:8px;font-size:14px;">المنتجات:</div>
        <table width="100%" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;color:#475569;text-align:right;font-size:13px;border-bottom:2px solid #e2e8f0;">المنتج</th>
              <th style="padding:8px 12px;color:#475569;text-align:center;font-size:13px;border-bottom:2px solid #e2e8f0;">الكمية</th>
              <th style="padding:8px 12px;color:#475569;text-align:left;font-size:13px;border-bottom:2px solid #e2e8f0;">السعر</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div style="border-top:2px solid #C9A84C;padding-top:10px;margin-top:4px;display:flex;justify-content:space-between;">
          <span style="color:#1e293b;font-weight:bold;">الإجمالي</span>
          <span style="color:#C9A84C;font-weight:bold;font-size:18px;">${formatMoney(data.totalEgp)}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  await getTransporter().sendMail({
    from: `"الركن الخليجي — إشعارات" <${process.env.GMAIL_USER}>`,
    to: admins.join(', '),
    subject: `🆕 طلب جديد ${data.orderNumber} — ${data.customerName}`,
    html,
  })
}

// ─── Items Edited ─────────────────────────────────────────────────────────────

export interface EditItemsNotifData {
  orderId: string
  orderNumber?: string
  customerName: string
  customerPhone: string
  city: string
  newItems: Array<{ name: string; quantity: number; sellEgp: number }>
  newTotalEgp: number
}

export async function sendAdminEditItemsNotification(data: EditItemsNotifData) {
  const admins = getAdminEmails()
  if (!admins.length || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const itemsRows = data.newItems.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#1e293b;">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#1e293b;">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:left;color:#1e293b;font-weight:600;">${formatMoney(i.sellEgp * i.quantity)}</td>
    </tr>`).join('')

  const orderRef = data.orderNumber ?? data.orderId

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#92400e;padding:20px 28px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:28px;">✏️</span>
      <div>
        <div style="color:#fcd34d;font-size:18px;font-weight:bold;">تعديل منتجات طلب — الركن الخليجي</div>
        <div style="color:#ffffff88;font-size:12px;margin-top:2px;">${formatDate()}</div>
      </div>
    </div>
    <div style="padding:24px 28px;">
      <div style="background:#fffbeb;border-right:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin-bottom:20px;">
        <div style="color:#92400e;font-size:13px;margin-bottom:4px;">الطلب</div>
        <div style="color:#78350f;font-size:18px;font-weight:bold;font-family:monospace;">${orderRef}</div>
      </div>
      <table width="100%" style="border-collapse:collapse;margin-bottom:8px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:120px;">العميل</td><td style="padding:6px 0;color:#1e293b;font-weight:600;">${data.customerName}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">الهاتف</td><td style="padding:6px 0;color:#1e293b;">${data.customerPhone}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">المدينة</td><td style="padding:6px 0;color:#1e293b;">${data.city}</td></tr>
      </table>
      <div style="margin-top:20px;">
        <div style="color:#1e293b;font-weight:bold;margin-bottom:8px;font-size:14px;">المنتجات الجديدة:</div>
        <table width="100%" style="border-collapse:collapse;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;color:#475569;text-align:right;font-size:13px;border-bottom:2px solid #e2e8f0;">المنتج</th>
              <th style="padding:8px 12px;color:#475569;text-align:center;font-size:13px;border-bottom:2px solid #e2e8f0;">الكمية</th>
              <th style="padding:8px 12px;color:#475569;text-align:left;font-size:13px;border-bottom:2px solid #e2e8f0;">السعر</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div style="border-top:2px solid #f59e0b;padding-top:10px;margin-top:4px;display:flex;justify-content:space-between;">
          <span style="color:#1e293b;font-weight:bold;">الإجمالي الجديد</span>
          <span style="color:#f59e0b;font-weight:bold;font-size:18px;">${formatMoney(data.newTotalEgp)}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  await getTransporter().sendMail({
    from: `"الركن الخليجي — إشعارات" <${process.env.GMAIL_USER}>`,
    to: admins.join(', '),
    subject: `✏️ تعديل منتجات الطلب ${orderRef} — ${data.customerName}`,
    html,
  })
}

// ─── Info Updated ─────────────────────────────────────────────────────────────

export interface UpdateInfoNotifData {
  orderId: string
  orderNumber?: string
  customerName: string
  customerPhone: string
  city: string
  newAddress: string
  newNotes: string
}

export async function sendAdminUpdateInfoNotification(data: UpdateInfoNotifData) {
  const admins = getAdminEmails()
  if (!admins.length || !process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return

  const orderRef = data.orderNumber ?? data.orderId

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#1e3a5f;padding:20px 28px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:28px;">📝</span>
      <div>
        <div style="color:#93c5fd;font-size:18px;font-weight:bold;">تحديث بيانات طلب — الركن الخليجي</div>
        <div style="color:#ffffff88;font-size:12px;margin-top:2px;">${formatDate()}</div>
      </div>
    </div>
    <div style="padding:24px 28px;">
      <div style="background:#eff6ff;border-right:4px solid #3b82f6;padding:12px 16px;border-radius:8px;margin-bottom:20px;">
        <div style="color:#1d4ed8;font-size:13px;margin-bottom:4px;">الطلب</div>
        <div style="color:#1e3a8a;font-size:18px;font-weight:bold;font-family:monospace;">${orderRef}</div>
      </div>
      <table width="100%" style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;width:120px;">العميل</td><td style="padding:8px 0;color:#1e293b;font-weight:600;">${data.customerName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">الهاتف</td><td style="padding:8px 0;color:#1e293b;">${data.customerPhone}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">المدينة</td><td style="padding:8px 0;color:#1e293b;">${data.city}</td></tr>
        <tr style="background:#f0fdf4;">
          <td style="padding:8px 12px;color:#15803d;font-weight:600;">العنوان الجديد</td>
          <td style="padding:8px 12px;color:#14532d;font-weight:600;">${data.newAddress}</td>
        </tr>
        ${data.newNotes ? `<tr style="background:#fef9c3;"><td style="padding:8px 12px;color:#854d0e;font-weight:600;">الملاحظات</td><td style="padding:8px 12px;color:#713f12;">${data.newNotes}</td></tr>` : ''}
      </table>
    </div>
  </div>
</body>
</html>`

  await getTransporter().sendMail({
    from: `"الركن الخليجي — إشعارات" <${process.env.GMAIL_USER}>`,
    to: admins.join(', '),
    subject: `📝 تحديث بيانات الطلب ${orderRef} — ${data.customerName}`,
    html,
  })
}
