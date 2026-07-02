'use client'
import { useEffect, useState, useMemo } from 'react'
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
const EDITABLE = ['newOrder', 'preparing']
export const DRAFT_KEY = 'editOrderDraft'

interface MarketItem { name: string; quantity: number; sellEgp: number }
interface MyOrder {
  id: string; orderNumber: string; status: string; totalEgp: number
  city: string; address: string; notes: string
  createdAt: { seconds: number }
  items?: Array<{ productId: string; quantity: number }>
  marketItems?: MarketItem[]
}
export interface DraftItem { productId: string; name: string; sellEgp: number; quantity: number }
export interface EditOrderDraft { orderId: string; orderNumber: string; draftItems: DraftItem[] }

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Address edit
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addrState, setAddrState] = useState({ address: '', notes: '' })
  const [savingAddr, setSavingAddr] = useState(false)

  // Items edit
  const [editingItemsId, setEditingItemsId] = useState<string | null>(null)
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [savingItems, setSavingItems] = useState(false)

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  const getToken = async () => {
    if (!user) throw new Error('غير مسجّل')
    return user.getIdToken()
  }

  // Load orders — and restore edit mode if returning from the products page
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/auth?next=/my-orders'); return }
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'orders'), where('customerUid', '==', user.uid)))
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as MyOrder))
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setOrders(list)

        // Restore draft if user came back from products page
        try {
          const raw = sessionStorage.getItem(DRAFT_KEY)
          if (raw) {
            const draft: EditOrderDraft = JSON.parse(raw)
            const order = list.find(o => o.id === draft.orderId)
            if (order && EDITABLE.includes(order.status)) {
              setDraftItems(draft.draftItems)
              setEditingItemsId(draft.orderId)
            } else {
              sessionStorage.removeItem(DRAFT_KEY)
            }
          }
        } catch { /* ignore */ }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [user, authLoading, router])

  // Keep sessionStorage in sync whenever draft changes
  useEffect(() => {
    if (!editingItemsId) return
    const order = orders.find(o => o.id === editingItemsId)
    if (!order) return
    const draft: EditOrderDraft = { orderId: editingItemsId, orderNumber: order.orderNumber, draftItems }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draftItems, editingItemsId, orders])

  const draftTotal = useMemo(
    () => draftItems.reduce((s, i) => s + i.sellEgp * i.quantity, 0),
    [draftItems]
  )

  const startEditItems = (order: MyOrder) => {
    const initial: DraftItem[] = (order.marketItems ?? []).map((mi, i) => ({
      productId: order.items?.[i]?.productId ?? '',
      name: mi.name,
      sellEgp: mi.sellEgp,
      quantity: mi.quantity,
    }))
    setDraftItems(initial)
    setEditingItemsId(order.id)
    // Persist to sessionStorage immediately so goToAddProduct can read it
    const draft: EditOrderDraft = { orderId: order.id, orderNumber: order.orderNumber, draftItems: initial }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  const cancelEditItems = () => {
    setEditingItemsId(null)
    setDraftItems([])
    sessionStorage.removeItem(DRAFT_KEY)
  }

  // Navigate to products page in "add to order" mode
  const goToAddProduct = () => {
    // draft is already in sessionStorage — products page will detect it
    router.push('/')
  }

  const changeQty = (productId: string, delta: number) => {
    setDraftItems(prev => prev.map(i =>
      i.productId === productId
        ? { ...i, quantity: Math.max(1, Math.min(99, i.quantity + delta)) }
        : i
    ))
  }

  const removeItem = (productId: string) => {
    setDraftItems(prev => prev.filter(i => i.productId !== productId))
  }

  const handleSaveItems = async (order: MyOrder) => {
    setSavingItems(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/orders/${order.id}/edit-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: draftItems.map(i => ({ productId: i.productId, quantity: i.quantity })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        items: draftItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
        marketItems: draftItems.map(i => ({ name: i.name, sellEgp: i.sellEgp, quantity: i.quantity })),
        totalEgp: draftTotal,
      } : o))
      sessionStorage.removeItem(DRAFT_KEY)
      setEditingItemsId(null)
      setDraftItems([])
    } catch (err) { alert(err instanceof Error ? err.message : 'حدث خطأ') }
    finally { setSavingItems(false) }
  }

  const handleCancel = async (order: MyOrder) => {
    if (!confirm(`هل تريد إلغاء الطلب ${order.orderNumber}؟`)) return
    setCancellingId(order.id)
    try {
      const token = await getToken()
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o))
    } catch (err) { alert(err instanceof Error ? err.message : 'حدث خطأ') }
    finally { setCancellingId(null) }
  }

  const handleSaveAddr = async (order: MyOrder) => {
    setSavingAddr(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/orders/${order.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(addrState),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...addrState } : o))
      setEditingAddressId(null)
    } catch (err) { alert(err instanceof Error ? err.message : 'حدث خطأ') }
    finally { setSavingAddr(false) }
  }

  if (authLoading || loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin" />
    </div>
  )

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

                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-navy">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                {/* ── EDIT MODE ── */}
                {editingItemsId === order.id ? (
                  <div className="space-y-3">

                    {/* Section: edit quantities */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">تعديل الكميات</p>
                      {draftItems.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gold/30 rounded-lg">
                          لا يوجد منتجات — أضف منتجاً أو ألغِ الطلب
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {draftItems.map(item => (
                            <div key={item.productId} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-navy truncate">{item.name}</p>
                                <p className="text-xs text-gold">{money(item.sellEgp)}</p>
                              </div>
                              {/* +/- */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => changeQty(item.productId, -1)}
                                  className="w-7 h-7 rounded-lg border border-gold/40 text-navy font-black hover:bg-gold/10 flex items-center justify-center text-base"
                                >−</button>
                                <span className="w-8 text-center text-sm font-black text-navy">{item.quantity}</span>
                                <button
                                  onClick={() => changeQty(item.productId, 1)}
                                  className="w-7 h-7 rounded-lg border border-gold/40 text-navy font-black hover:bg-gold/10 flex items-center justify-center text-base"
                                >+</button>
                              </div>
                              {/* delete */}
                              <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section: add product → go to store */}
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">إضافة منتج جديد</p>
                      <button
                        onClick={goToAddProduct}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-navy/30 text-navy text-sm font-bold hover:border-navy hover:bg-navy/5 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        تصفّح المنتجات وأضف للطلب
                      </button>
                    </div>

                    {/* Total + save/cancel */}
                    <div className="flex items-center justify-between pt-2 border-t border-gold/20">
                      <span className="text-sm text-gray-500">الإجمالي الجديد</span>
                      <span className="font-black text-gold text-lg">{money(draftTotal)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveItems(order)}
                        disabled={savingItems || draftItems.length === 0}
                        className="flex-1 bg-navy text-white text-sm font-bold py-2.5 rounded-lg hover:bg-navy/90 disabled:opacity-50"
                      >
                        {savingItems ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                      </button>
                      <button
                        onClick={cancelEditItems}
                        className="px-4 py-2 text-sm font-bold text-navy border border-gold/30 rounded-lg hover:bg-gold/10"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>

                ) : (
                  /* ── NORMAL VIEW ── */
                  <>
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

                    {/* Address edit inline */}
                    {editingAddressId === order.id ? (
                      <div className="mt-3 pt-3 border-t border-gold/20 space-y-3">
                        <div>
                          <label className="text-xs font-bold text-navy block mb-1">العنوان *</label>
                          <input type="text" value={addrState.address}
                            onChange={e => setAddrState(s => ({ ...s, address: e.target.value }))}
                            className="w-full border border-gold/40 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-gold" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-navy block mb-1">ملاحظات</label>
                          <textarea value={addrState.notes} rows={2}
                            onChange={e => setAddrState(s => ({ ...s, notes: e.target.value }))}
                            className="w-full border border-gold/40 rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-gold resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveAddr(order)} disabled={savingAddr}
                            className="flex-1 bg-navy text-white text-sm font-bold py-2 rounded-lg hover:bg-navy/90 disabled:opacity-50">
                            {savingAddr ? 'جاري الحفظ...' : 'حفظ العنوان'}
                          </button>
                          <button onClick={() => setEditingAddressId(null)}
                            className="px-4 py-2 text-sm font-bold text-navy border border-gold/30 rounded-lg hover:bg-gold/10">
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : EDITABLE.includes(order.status) && (
                      <div className="mt-3 pt-3 border-t border-gold/10 grid grid-cols-3 gap-2">
                        <button onClick={() => startEditItems(order)}
                          className="text-xs font-bold py-2 rounded-lg border border-navy text-navy hover:bg-navy/5">
                          تعديل الطلب
                        </button>
                        <button onClick={() => { setEditingAddressId(order.id); setAddrState({ address: order.address, notes: order.notes ?? '' }) }}
                          className="text-xs font-bold py-2 rounded-lg border border-navy text-navy hover:bg-navy/5">
                          تعديل العنوان
                        </button>
                        <button onClick={() => handleCancel(order)} disabled={cancellingId === order.id}
                          className="text-xs font-bold py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">
                          {cancellingId === order.id ? '...' : 'إلغاء الطلب'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
