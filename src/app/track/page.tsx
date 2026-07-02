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

const STATUS_COLOR: Record<string, string> = {
  newOrder:     'bg-blue-100 text-blue-800',
  preparing:    'bg-amber-100 text-amber-800',
  readyToShip:  'bg-purple-100 text-purple-800',
  shipped:      'bg-cyan-100 text-cyan-800',
  delivered:    'bg-green-100 text-green-800',
  collected:    'bg-green-200 text-green-900',
  returned:     'bg-red-100 text-red-800',
  cancelled:    'bg-gray-100 text-gray-600',
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
    const num = orderNumber.trim().toUpperCase()
    const ph = phone.trim()

    if (!num || !ph) {
      setError('يرجى إدخال رقم الطلب ورقم الهاتف')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    try {
      await ensureAuth()

      // Try by orderNumber field first, then by document ID
      let foundDoc: { id: string; data: () => Omit<OrderResult, 'id'> } | null = null

      const snap = await getDocs(
        query(collection(db, 'orders'), where('orderNumber', '==', num), limit(1))
      )
      if (!snap.empty) {
        const d = snap.docs[0]
        foundDoc = { id: d.id, data: () => d.data() as Omit<OrderResult, 'id'> }
      } else {
        // Try by Firestore document ID
        const docRef = doc(db, 'orders', num)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          foundDoc = { id: docSnap.id, data: () => docSnap.data() as Omit<OrderResult, 'id'> }
        }
      }

      if (!foundDoc) {
        setResult('not_found')
        return
      }

      const data = foundDoc.data()
      if (data.customerPhone !== ph) {
        setResult('not_found')
        return
      }

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
          <input
            type="text"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            placeholder="مثال: GM-20260628-1045123"
            dir="ltr"
            className="w-full border border-gold/40 rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold font-mono"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-navy block mb-1">رقم الهاتف *</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            dir="ltr"
            className="w-full border border-gold/40 rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" /> جاري البحث...</>
          ) : 'بحث عن الطلب'}
        </button>
      </form>

      {result === 'not_found' && (
        <div className="card p-6 text-center">
          <p className="font-black text-navy text-lg mb-2">لم يتم العثور على الطلب</p>
          <p className="text-gray-500 text-sm">تأكد من رقم الطلب ورقم الهاتف وحاول مرة أخرى.</p>
        </div>
      )}

      {result && result !== 'not_found' && (
        <div className="space-y-3">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">رقم الطلب</p>
                <p className="font-black text-navy font-mono">{result.orderNumber}</p>
              </div>
              <span className={`text-sm font-black px-3 py-1 rounded-full ${STATUS_COLOR[result.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[result.status] ?? result.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">الاسم</p>
                <p className="font-bold text-navy">{result.customerName}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">المدينة</p>
                <p className="font-bold text-navy">{result.city}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">تاريخ الطلب</p>
                <p className="font-bold text-navy">
                  {result.createdAt
                    ? new Date(result.createdAt.seconds * 1000).toLocaleDateString('ar-EG')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">الإجمالي</p>
                <p className="font-black text-gold">{money(result.totalEgp)}</p>
              </div>
            </div>

            {result.trackingNumber && (
              <div className="mt-3 pt-3 border-t border-gold/20">
                <p className="text-gray-500 text-xs mb-1">رقم الشحن</p>
                <p className="font-black text-navy font-mono">{result.trackingNumber}</p>
              </div>
            )}
          </div>

          {result.marketItems && result.marketItems.length > 0 && (
            <div className="card p-4">
              <p className="font-black text-navy mb-3">المنتجات</p>
              <div className="space-y-2">
                {result.marketItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-gold/10 last:border-0">
                    <span className="text-gray-700">{item.name} × {item.quantity}</span>
                    <span className="font-bold text-navy">{money(item.sellEgp * item.quantity)}</span>
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
