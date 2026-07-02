'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore'
import ProductCard from '@/components/ProductCard'
import { useCart } from '@/context/CartContext'
import { db, ensureAuth } from '@/lib/firebase'
import { Product, ProductCategory } from '@/lib/types'
import { DRAFT_KEY, type DraftItem, type EditOrderDraft } from '@/lib/edit-order'

type SortOption = 'default' | 'price_asc' | 'price_desc'

function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-9 bg-gray-200 rounded-lg mt-2" />
      </div>
    </div>
  )
}

export default function HomePage() {
  const { syncWithProducts } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('الكل')
  const [search, setSearch] = useState<string>('')
  const [sort, setSort] = useState<SortOption>('default')

  // Edit-order mode (detected from sessionStorage)
  const [editDraft, setEditDraft] = useState<EditOrderDraft | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) setEditDraft(JSON.parse(raw) as EditOrderDraft)
    } catch { /* ignore */ }
  }, [])

  const handleAddToOrder = (product: Product) => {
    setEditDraft(prev => {
      if (!prev) return prev
      const existing = prev.draftItems.find(i => i.productId === product.id)
      const newItems: DraftItem[] = existing
        ? prev.draftItems.map(i =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...prev.draftItems, { productId: product.id, name: product.name, sellEgp: product.sellEgp, quantity: 1 }]
      const updated = { ...prev, draftItems: newItems }
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(updated))
      return updated
    })
  }

  useEffect(() => {
    let unsub: (() => void) | undefined
    ensureAuth().then(async () => {
      const catSnap = await getDocs(collection(db, 'productCategories'))
      const map: Record<string, string> = {}
      catSnap.docs.forEach(d => {
        const c = d.data() as ProductCategory
        map[d.id] = c.name ?? d.id
      })
      setCategoryMap(map)

      const q = query(
        collection(db, 'products'),
        where('visibleInMarket', '==', true),
        limit(100)
      )
      unsub = onSnapshot(q, snap => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.quantity > 0)
        setProducts(list)
        syncWithProducts(list)
        setLoading(false)
      })
    })
    return () => unsub?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = useMemo(() => {
    const names = products.map(p => (p.categoryId && categoryMap[p.categoryId]) || p.marketCategory || '')
    return ['الكل', ...Array.from(new Set(names.filter(Boolean)))]
  }, [products, categoryMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter(p => {
        if (category === 'الكل') return true
        const cat = (p.categoryId && categoryMap[p.categoryId]) || p.marketCategory || ''
        return cat === category
      })
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'price_asc') return a.sellEgp - b.sellEgp
        if (sort === 'price_desc') return b.sellEgp - a.sellEgp
        return a.name.localeCompare(b.name, 'ar')
      })
  }, [products, category, search, sort, categoryMap])

  const lowStockCount = useMemo(
    () => products.filter(p => p.quantity > 0 && p.quantity <= 3).length,
    [products]
  )

  const addedCount = editDraft?.draftItems.reduce((s, i) => s + i.quantity, 0) ?? 0

  return (
    <div className="space-y-5">

      {/* ── Edit-order banner ── */}
      {editDraft && (
        <div className="sticky top-16 z-50 -mx-4 px-4 py-3 bg-navy text-white flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-black truncate">تعديل الطلب {editDraft.orderNumber}</p>
              <p className="text-xs text-white/70">
                اضغط على أي منتج لإضافته للطلب
                {addedCount > 0 && ` · ${addedCount} منتج مضاف`}
              </p>
            </div>
          </div>
          <Link
            href="/my-orders"
            className="flex-shrink-0 bg-gold text-navy text-xs font-black px-3 py-2 rounded-lg hover:bg-gold/90 whitespace-nowrap"
          >
            العودة للطلب ←
          </Link>
        </div>
      )}

      <section className="bg-navy text-white rounded-lg overflow-hidden border border-navy-dark">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-gold text-sm font-bold mb-2">تجربة تسوق سريعة ومباشرة</p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">الركن الخليجي</h1>
              <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl">
                اختار منتجاتك، راجع السلة، وأكد الطلب في خطوات قليلة.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 min-w-full sm:min-w-[280px]">
              <div className="rounded-lg bg-white/10 border border-white/10 p-3 text-center">
                <p className="text-xl font-black">{products.length}</p>
                <p className="text-[11px] text-white/70">منتج متاح</p>
              </div>
              <div className="rounded-lg bg-white/10 border border-white/10 p-3 text-center">
                <p className="text-xl font-black">{categories.length}</p>
                <p className="text-[11px] text-white/70">قسم</p>
              </div>
              <div className="rounded-lg bg-white/10 border border-white/10 p-3 text-center">
                <p className="text-xl font-black">{lowStockCount}</p>
                <p className="text-[11px] text-white/70">كمية محدودة</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-40 -mx-4 px-4 py-3 bg-cream/95 backdrop-blur border-y border-gold/20">
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث باسم المنتج..."
                className="w-full border border-gold/40 rounded-lg py-3 pr-11 pl-10 text-sm text-navy font-semibold outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white shadow-sm"
                dir="rtl"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
              </svg>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="مسح البحث"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy text-lg font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="w-full text-sm font-bold text-navy border border-gold/40 rounded-lg py-3 px-3 bg-white outline-none focus:border-gold cursor-pointer"
              dir="rtl"
            >
              <option value="default">ترتيب افتراضي</option>
              <option value="price_asc">الأرخص أولًا</option>
              <option value="price_desc">الأغلى أولًا</option>
            </select>
          </div>

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`whitespace-nowrap text-sm font-bold py-2 px-4 rounded-lg border transition-all duration-200 flex-shrink-0 ${
                    category === cat
                      ? 'bg-navy text-white border-navy shadow-sm'
                      : 'bg-white text-navy border-gold/35 hover:border-gold'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-navy text-xl font-black">المنتجات</h2>
            {!loading && (
              <p className="text-xs text-gray-500 mt-1">
                {filtered.length} نتيجة متاحة{category !== 'الكل' ? ` في ${category}` : ''}
              </p>
            )}
          </div>
          <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="btn-navy py-2 px-4 text-sm">
            تواصل معنا
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gold/30 rounded-lg text-center py-16 px-4">
            <p className="font-black text-navy mb-2">لا توجد منتجات مطابقة</p>
            <p className="text-gray-500 text-sm">جرّب تغيير البحث أو اختيار قسم آخر.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                editOrderMode={!!editDraft}
                draftQty={editDraft?.draftItems.find(d => d.productId === p.id)?.quantity ?? 0}
                onAddToOrder={handleAddToOrder}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="pt-6 border-t border-gold/20 text-center pb-6">
        <p className="font-black text-navy text-lg mb-1">الركن الخليجي</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-green-600 font-semibold">
            واتساب
          </a>
          <span className="text-gray-300">|</span>
          <a href="https://www.facebook.com/groups/618310885443604/?ref=share&mibextid=NSMWBT" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-[#1877F2] font-semibold">
            فيسبوك
          </a>
          <span className="text-gray-300">|</span>
          <Link href="/insights" className="text-sm text-gray-500 hover:text-navy font-semibold">
            الإحصائيات
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-3">جميع الحقوق محفوظة © 2026</p>
      </footer>
    </div>
  )
}
