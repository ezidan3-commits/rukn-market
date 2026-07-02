'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

const STATUS_LABEL: Record<string, string> = {
  newOrder: 'أوردر جديد',
  preparing: 'قيد التحضير',
  readyToShip: 'جاهز للشحن',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  collected: 'تم التحصيل',
  returned: 'مرتجع',
  cancelled: 'ملغي',
}

const STATUS_COLOR: Record<string, string> = {
  newOrder: 'bg-blue-100 text-blue-800',
  preparing: 'bg-amber-100 text-amber-800',
  readyToShip: 'bg-purple-100 text-purple-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  collected: 'bg-green-200 text-green-900',
  returned: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

const CANCELLABLE = ['newOrder', 'preparing']
const EDITABLE = ['newOrder', 'preparing']

interface MyOrder {
  id: string
  orderNumber: string
  status: string
  totalEgp: number
  city: string
  address: string
  notes: string
  createdAt: { seconds: number }
  marketItems?: Array<{ name: string; quantity: number; sellEgp: number }>
}

interface EditState {
  address: string
  notes: string
}

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ address: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth?next=/my-orders'); return }

    const load = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'orders'),
            where('customerUid', '==', user.uid)
          )
        )
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as MyOrder))
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setOrders(list)
      } catch (err) {
        console.error('my-orders load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, authLoading, router])

  const getToken = async () => {
    if (!user) throw new Error('غير مسجّل')
    return user.getIdToken()
  }

  const handleCancel = async (order: MyOrder) => {
    if (!confirm(`هل تريد إلغاء الطلب ${order.orderNumber}؟`)) return
    setCancellingId(order.id)
    try {
      const token = await getToken()
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setCancellingId(null)
    }
  }

  const startEdit = (order: MyOrder) => {
    setEditingId(order.id)
    setEditState({ address: order.address, notes: order.notes ?? '' })
  }

  const handleSaveEdit = async (order: MyOrder) => {
    setSavingEdit(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/orders/${order.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address: editState.address, notes: editState.notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, address: editState.address, notes: editState.notes } : o
      ))
      setEditingId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setSavingEdit(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-black text-navy text-2xl">طلباتي</h1>
          <p className="text-gray-500 text-sm mt-1">يمكنك تعديل أو إلغاء الطلب قبل الشحن</p>
        </div>
        <Link href="/" className="btn-navy py-2 px-4 text-sm">المتجر</Link>
      </div>

      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-black text-navy text-lg mb-2">لا توجد طلبات بعد</p>
          <p className="text-gray-500 text-sm mb-4">تفضّل وتسوّق من متجرنا!</p>
          <Link href="/" className="btn-primary inline-block px-6">تصفّح المنتجات</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="card overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-navy">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.createdAt
                        ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('ar-EG')
                        : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                {order.marketItems && order.marketItems.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {order.marketItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-600">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-bold text-navy">{money(item.sellEgp * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gold/10">
                  <span className="text-xs text-gray-500">{order.city}</span>
                  <span className="font-black text-gold">{money(order.totalEgp)}</span>
                </div>

                {editingId === order.id ? (
                  <div className="mt-3 pt-3 border-t border-gold/20 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-navy block mb-1">العنوان *</label>
                      <input
                        type="text"
                        value={editState.address}
                        onChange={e => setEditState(s => ({ ...s, address: e.target.value }))}
                        className="w-full border border-gold/40 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-navy block mb-1">ملاحظات</label>
                      <textarea
                        value={editState.notes}
                        onChange={e => setEditState(s => ({ ...s, notes: e.target.value }))}
                        rows={2}
                        className="w-full border border-gold/40 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-gold resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(order)}
                        disabled={savingEdit}
                        className="flex-1 bg-navy text-white text-sm font-bold py-2 rounded-lg hover:bg-navy/90 disabled:opacity-50"
                      >
                        {savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-sm font-bold text-navy border border-gold/30 rounded-lg hover:bg-gold/10"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  EDITABLE.includes(order.status) && (
                    <div className="mt-3 pt-3 border-t border-gold/10 flex gap-2">
                      <button
                        onClick={() => startEdit(order)}
                        className="flex-1 text-sm font-bold py-2 rounded-lg border border-navy text-navy hover:bg-navy/5"
                      >
                        تعديل العنوان
                      </button>
                      {CANCELLABLE.includes(order.status) && (
                        <button
                          onClick={() => handleCancel(order)}
                          disabled={cancellingId === order.id}
                          className="flex-1 text-sm font-bold py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancellingId === order.id ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
