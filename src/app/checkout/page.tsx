'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { CheckoutForm, PaymentMethod, PAYMENT_OPTIONS, effectivePrice } from '@/lib/types'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clear } = useCart()
  const { user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({})

  const [form, setForm] = useState<CheckoutForm>({
    customerName: '',
    customerPhone: '',
    city: '',
    address: '',
    notes: '',
    payment: 'cash',
  })

  useEffect(() => {
    if (items.length === 0) router.replace('/')
  }, [items, router])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.isAnonymous) router.replace('/auth?next=/checkout')
  }, [user, authLoading, router])

  // Prefill contact fields from the customer's most recent order — still fully editable
  useEffect(() => {
    if (!user || user.isAnonymous) return
    const loadLastOrder = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'orders'), where('customerUid', '==', user.uid)))
        if (snap.empty) return
        const orders = snap.docs.map(d => d.data() as {
          customerName?: string; customerPhone?: string; city?: string; address?: string
          createdAt?: { seconds: number }
        })
        orders.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        const last = orders[0]
        setForm(f => ({
          ...f,
          customerName: f.customerName || last.customerName || '',
          customerPhone: f.customerPhone || last.customerPhone || '',
          city: f.city || last.city || '',
          address: f.address || last.address || '',
        }))
      } catch (err) { console.error(err) }
    }
    loadLastOrder()
  }, [user])

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  const setField = (field: keyof CheckoutForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<CheckoutForm> = {}
    if (!form.customerName.trim()) e.customerName = 'الاسم مطلوب'
    if (!form.customerPhone.trim()) e.customerPhone = 'رقم الهاتف مطلوب'
    if (!/^[0-9]{10,11}$/.test(form.customerPhone.trim())) e.customerPhone = 'رقم هاتف غير صحيح'
    if (!form.city.trim()) e.city = 'المدينة مطلوبة'
    if (!form.address.trim()) e.address = 'العنوان مطلوب'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (user && !user.isAnonymous) {
        const token = await user.getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          notes: form.notes.trim(),
          payment: form.payment,
          items: items.map(i => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error ?? 'حدث خطأ أثناء إرسال الطلب')
      }

      const orderNumber = String(result.orderNumber ?? result.id ?? '')
      const waLines = [
        'طلب جديد من الركن الخليجي',
        orderNumber ? `رقم الطلب: ${orderNumber}` : '',
        '',
        `الاسم: ${form.customerName.trim()}`,
        `الهاتف: ${form.customerPhone.trim()}`,
        `المدينة: ${form.city.trim()}`,
        `العنوان: ${form.address.trim()}`,
        '',
        'المنتجات:',
        ...items.map(i => `- ${i.product.name} × ${i.quantity} = ${money(effectivePrice(i.product) * i.quantity)}`),
        '',
        `الإجمالي: ${money(total)}`,
        `الدفع: ${PAYMENT_OPTIONS.find(o => o.method === form.payment)?.label ?? form.payment}`,
        form.notes.trim() ? `ملاحظات: ${form.notes.trim()}` : '',
      ].filter(Boolean).join('\n')

      sessionStorage.setItem('lastOrderId', orderNumber)
      clear()
      window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${encodeURIComponent(waLines)}`, '_blank')
      router.push('/order-success')
    } catch (err: unknown) {
      setSubmitting(false)
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال الطلب'
      alert(msg + '\n\nتأكد من اتصالك بالإنترنت وحاول مرة أخرى.')
    }
  }

  if (authLoading || !user || user.isAnonymous) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-black text-navy text-2xl">تأكيد الطلب</h1>
          <p className="text-gray-500 text-sm mt-1">راجع بياناتك قبل إرسال الطلب.</p>
        </div>
        <Link href="/cart" className="text-sm font-bold text-navy hover:text-gold">العودة للسلة</Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-lg bg-navy text-white font-black flex items-center justify-center">1</span>
              <div>
                <p className="font-black text-navy">بيانات التواصل</p>
                <p className="text-xs text-gray-500">سنستخدمها لتأكيد الطلب والتوصيل.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-navy block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e => setField('customerName', e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="w-full border rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
                  style={{ borderColor: errors.customerName ? '#ef4444' : '#C9A84C66' }}
                />
                {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold text-navy block mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={e => setField('customerPhone', e.target.value)}
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                  className="w-full border rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
                  style={{ borderColor: errors.customerPhone ? '#ef4444' : '#C9A84C66' }}
                />
                {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold text-navy block mb-1">المدينة / المنطقة *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setField('city', e.target.value)}
                  placeholder="مثال: القاهرة"
                  className="w-full border rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
                  style={{ borderColor: errors.city ? '#ef4444' : '#C9A84C66' }}
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-navy block mb-1">العنوان بالتفصيل *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}
                  placeholder="مثال: شارع التحرير، بجوار مسجد النور، عمارة 5"
                  className="w-full border rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
                  style={{ borderColor: errors.address ? '#ef4444' : '#C9A84C66' }}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-navy block mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="أي تعليمات خاصة للطلب..."
                  rows={3}
                  className="w-full border rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold resize-none"
                  style={{ borderColor: '#C9A84C66' }}
                />
              </div>
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-lg bg-navy text-white font-black flex items-center justify-center">2</span>
              <div>
                <p className="font-black text-navy">طريقة الدفع</p>
                <p className="text-xs text-gray-500">اختر الطريقة المناسبة لك.</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {PAYMENT_OPTIONS.map(opt => (
                <label
                  key={opt.method}
                  className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.payment === opt.method
                      ? 'border-navy bg-navy/5'
                      : 'border-gold/30 hover:border-gold/60 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    form.payment === opt.method ? 'border-navy' : 'border-gray-300'
                  }`}>
                    {form.payment === opt.method && (
                      <div className="w-2.5 h-2.5 rounded-full bg-navy" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    value={opt.method}
                    checked={form.payment === opt.method}
                    onChange={() => setField('payment', opt.method as PaymentMethod)}
                    className="sr-only"
                  />
                  <div>
                    <p className="font-black text-navy text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-500 leading-5">{opt.details}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="card p-4 lg:sticky lg:top-24">
          <p className="font-black text-navy mb-3">ملخص الطلب</p>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between gap-3 text-sm py-2 border-b border-gold/10 last:border-b-0">
                <span className="text-gray-700 leading-5">{product.name} × {quantity}</span>
                <span className="text-navy font-bold whitespace-nowrap">{money(effectivePrice(product) * quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gold/20 mt-3 pt-3 flex justify-between font-black text-navy">
            <span>الإجمالي</span>
            <span className="text-gold text-xl">{money(total)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-center flex items-center justify-center gap-2 mt-4"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                جاري إرسال الطلب...
              </>
            ) : (
              'تأكيد الطلب'
            )}
          </button>

          <p className="text-xs text-gray-500 leading-5 mt-3">
            بعد التأكيد سيتم تسجيل الطلب وفتح رسالة واتساب جاهزة لإرسالها لصاحب المتجر.
          </p>
        </aside>
      </form>
    </div>
  )
}
