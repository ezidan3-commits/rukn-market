'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, serverTimestamp, Timestamp, runTransaction, doc } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'
import { useCart } from '@/context/CartContext'
import { PaymentMethod, PAYMENT_OPTIONS, CheckoutForm } from '@/lib/types'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, clear } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({})

  const [form, setForm] = useState<CheckoutForm>({
    customerName: '',
    customerPhone: '',
    city: '',
    notes: '',
    payment: 'cash',
  })

  useEffect(() => {
    if (items.length === 0) router.replace('/')
  }, [items, router])

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
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await ensureAuth()
      const now = Timestamp.now()

      await runTransaction(db, async (tx) => {
        // read all product docs and check stock
        const productRefs = items.map(i => doc(db, 'products', i.product.id))
        const productSnaps = await Promise.all(productRefs.map(r => tx.get(r)))

        for (let i = 0; i < items.length; i++) {
          const snap = productSnaps[i]
          const available = (snap.data()?.quantity ?? 0) as number
          if (available < items[i].quantity) {
            throw new Error(`المنتج "${items[i].product.name}" لم يعد متاحاً بالكمية المطلوبة`)
          }
        }

        // deduct quantities
        for (let i = 0; i < items.length; i++) {
          const snap = productSnaps[i]
          const available = (snap.data()?.quantity ?? 0) as number
          tx.update(productRefs[i], { quantity: available - items[i].quantity })
        }

        // create order
        const orderRef = doc(collection(db, 'orders'))
        tx.set(orderRef, {
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          city: form.city.trim(),
          items: items.map(i => ({
            productId: i.product.id,
            quantity: i.quantity,
            discountValue: 0,
            discountType: 'fixed',
          })),
          status: 'newOrder',
          notes: form.notes.trim(),
          createdBy: 'ماركت - ' + form.customerName.trim(),
          createdAt: now,
          isVip: false,
          trackingNumber: '',
          paymentMethod: form.payment,
          updatedAt: serverTimestamp(),
        })
      })

      clear()
      router.push('/order-success')
    } catch (err: unknown) {
      setSubmitting(false)
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال الطلب'
      alert(msg + '\n\nتأكد من اتصالك بالإنترنت وحاول مرة أخرى.')
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/cart" className="text-navy hover:text-gold">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <h1 className="font-black text-navy text-xl">تأكيد الطلب</h1>
      </div>

      {/* Order summary */}
      <div className="card p-4 mb-4">
        <p className="font-bold text-navy mb-2 text-sm">ملخص الطلب</p>
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex justify-between text-sm py-1">
            <span className="text-gray-700">{product.name} × {quantity}</span>
            <span className="text-navy font-semibold">{money(product.sellEgp * quantity)}</span>
          </div>
        ))}
        <div className="border-t border-gold/20 mt-2 pt-2 flex justify-between font-black text-navy">
          <span>الإجمالي</span>
          <span className="text-gold">{money(total)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Personal info */}
        <div className="card p-4 flex flex-col gap-3">
          <p className="font-bold text-navy text-sm mb-1">بياناتك</p>

          <div>
            <label className="text-sm font-semibold text-navy block mb-1">الاسم الكامل *</label>
            <input
              type="text"
              value={form.customerName}
              onChange={e => setField('customerName', e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full border rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
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
              className="w-full border rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
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
              className="w-full border rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
              style={{ borderColor: errors.city ? '#ef4444' : '#C9A84C66' }}
            />
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-navy block mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="أي تعليمات خاصة للطلب..."
              rows={3}
              className="w-full border rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold resize-none"
              style={{ borderColor: '#C9A84C66' }}
            />
          </div>
        </div>

        {/* Payment method */}
        <div className="card p-4">
          <p className="font-bold text-navy text-sm mb-3">طريقة الدفع</p>
          <div className="flex flex-col gap-2">
            {PAYMENT_OPTIONS.map(opt => (
              <label
                key={opt.method}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  form.payment === opt.method
                    ? 'border-navy bg-navy/5'
                    : 'border-gold/30 hover:border-gold/60'
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
                  <p className="font-bold text-navy text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.details}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full text-center flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              جاري إرسال الطلب...
            </>
          ) : (
            `تأكيد الطلب — ${money(total)}`
          )}
        </button>
      </form>
    </div>
  )
}
