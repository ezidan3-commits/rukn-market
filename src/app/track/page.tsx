'use client'
import { useState } from 'react'
import Link from 'next/link'
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'

const STATUS_LABEL: Record<string, string> = {
  newOrder:     'أوردر جديد',
  preparing:    'قيد التحضير',
  readyToShip:  'جاهز للشحن',
  shipped:      'تم الشحن',
  delivered:    'تم التسليم',
  collected:    'تم التحصيل',
  returned:     'مرتجع',
  cancelled:    'ملغي',
}

const TIMELINE_STEPS = [
  { key: 'newOrder',    label: 'تم الاستلام',  icon: '📋' },
  { key: 'preparing',   label: 'قيد التحضير',  icon: '🔄' },
  { key: 'readyToShip', label: 'جاهز للشحن',   icon: '📦' },
  { key: 'shipped',     label: 'في الطريق',     icon: '🚚' },
  { key: 'delivered',   label: 'تم التسليم',   icon: '✅' },
]
const STEP_KEYS = TIMELINE_STEPS.map(s => s.key)

function OrderTimeline({ status }: { status: string }) {
  const currentIndex = STEP_KEYS.indexOf(status)
  const isFinal = status === 'cancelled' || status === 'returned' || status === 'collected'

  if (isFinal) {
    const isCancel = status === 'cancelled'
    return (
      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isCancel ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <span className="text-4xl">{isCancel ? '❌' : status === 'returned' ? '↩️' : '🎉'}</span>
        <div>
          <p className={`font-black text-lg ${isCancel ? 'text-red-700' : 'text-green-700'}`}>{STATUS_LABEL[status]}</p>
          <p className={`text-xs mt-0.5 ${isCancel ? 'text-red-400' : 'text-green-400'}`}>
            {isCancel ? 'تم إلغاء الطلب' : 'تم إنهاء الطلب بنجاح'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {TIMELINE_STEPS.map((step, i) => {
        const done    = i < currentIndex
        const active  = i === currentIndex
        const isLast  = i === TIMELINE_STEPS.length - 1
        return (
          <div key={step.key} className="flex gap-4">
            {/* Connector column */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-300 ${
                done   ? 'bg-gold text-white' :
                active ? 'bg-navy text-white ring-4 ring-navy/20' :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={active ? 'text-base' : 'text-sm'}>{active ? step.icon : i + 1}</span>
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 min-h-[2rem] transition-all duration-300 ${done ? 'bg-gold' : 'bg-gray-200'}`} />
              )}
            </div>
            {/* Label */}
            <div className={`pt-2 pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
              <p className={`font-black text-sm ${done ? 'text-gold' : active ? 'text-navy' : 'text-gray-400'}`}>
                {step.label}
              </p>
              {active && (
                <span className="inline-block mt-1 text-[11px] bg-navy text-white px-2 py-0.5 rounded-full font-bold">
                  الحالة الحالية
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface OrderResult {
  id: string
  orderNumber: string
  customerPhone: string
  status: string
  totalEgp: number
  createdAt: { seconds: number }
  customerName: string
  city: string
  trackingNumber: string
  notes: string
  marketItems?: Array<{ name: string; quantity: number; sellEgp: number }>
}

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OrderResult | null | 'not_found'>(null)
  const [error, setError] = useState('')

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const numRaw = orderNumber.trim()
    const num = numRaw.toUpperCase()
    const ph = phone.trim()
    if (!num || !ph) { setError('يرجى إدخال رقم الطلب ورقم الهاتف'); return }

    setError(''); setLoading(true); setResult(null)
    try {
      await ensureAuth()
      let foundDoc: { id: string; data: () => Omit<OrderResult, 'id'> } | null = null
      const snap = await getDocs(query(collection(db, 'orders'), where('orderNumber', '==', num), limit(1)))
      if (!snap.empty) {
        const d = snap.docs[0]
        foundDoc = { id: d.id, data: () => d.data() as Omit<OrderResult, 'id'> }
      } else {
        const docSnap = await getDoc(doc(db, 'orders', numRaw))
        if (docSnap.exists()) foundDoc = { id: docSnap.id, data: () => docSnap.data() as Omit<OrderResult, 'id'> }
      }
      if (!foundDoc) { setResult('not_found'); return }
      const data = foundDoc.data()
      if (data.customerPhone !== ph) { setResult('not_found'); return }
      setResult({ id: foundDoc.id, ...data })
    } catch {
      setError('حدث خطأ، يرجى المحاولة مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-navy text-2xl font-black">تتبع طلبك</h1>
          <p className="text-gray-500 text-sm mt-1">أدخل رقم الطلب ورقم هاتفك لمعرفة حالة طلبك.</p>
        </div>
        <Link href="/" className="btn-navy py-2 px-4 text-sm">المتجر</Link>
      </div>

      <form onSubmit={handleSearch} className="card p-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-navy block mb-1">رقم الطلب *</label>
          <input type="text" value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
            placeholder="مثال: GM-20260628-1045123" dir="ltr"
            className="w-full border border-gold/40 rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold font-mono" />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy block mb-1">رقم الهاتف *</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX" dir="ltr"
            className="w-full border border-gold/40 rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? (<><div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />جاري البحث...</>) : 'بحث عن الطلب'}
        </button>
      </form>

      {result === 'not_found' && (
        <div className="card p-6 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-black text-navy text-lg mb-2">لم يتم العثور على الطلب</p>
          <p className="text-gray-500 text-sm">تأكد من رقم الطلب ورقم الهاتف وحاول مرة أخرى.</p>
        </div>
      )}

      {result && result !== 'not_found' && (
        <div className="space-y-4">
          {/* Order header */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">رقم الطلب</p>
                <p className="font-black text-navy font-mono text-lg">{result.orderNumber}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500 mb-0.5">التاريخ</p>
                <p className="font-bold text-navy text-sm">
                  {result.createdAt ? new Date(result.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : '—'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-cream rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-0.5">الاسم</p>
                <p className="font-black text-navy">{result.customerName}</p>
              </div>
              <div className="bg-cream rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-0.5">المدينة</p>
                <p className="font-black text-navy">{result.city}</p>
              </div>
              <div className="bg-cream rounded-xl p-3 col-span-2">
                <p className="text-gray-500 text-xs mb-0.5">الإجمالي</p>
                <p className="font-black text-gold text-xl">{money(result.totalEgp)}</p>
              </div>
            </div>
            {result.trackingNumber && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-blue-500 text-xs mb-0.5">رقم الشحن</p>
                <p className="font-black text-blue-800 font-mono">{result.trackingNumber}</p>
              </div>
            )}
          </div>

          {/* Visual Timeline */}
          <div className="card p-5">
            <p className="font-black text-navy mb-5 flex items-center gap-2">
              <span>🗺️</span> تتبع مراحل الطلب
            </p>
            <OrderTimeline status={result.status} />
          </div>

          {/* Products */}
          {result.marketItems && result.marketItems.length > 0 && (
            <div className="card p-4">
              <p className="font-black text-navy mb-3">📋 المنتجات</p>
              <div className="space-y-2">
                {result.marketItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-2.5 border-b border-gold/10 last:border-0">
                    <div>
                      <span className="text-gray-700 font-semibold">{item.name}</span>
                      <span className="text-gray-400 text-xs"> × {item.quantity}</span>
                    </div>
                    <span className="font-black text-navy">{money(item.sellEgp * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.notes && (
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
              <p className="text-navy text-sm">{result.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
