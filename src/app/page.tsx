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

const CATEGORY_EMOJI: Record<string, string> = {
  'الكل':           '🛍️',
  'عطور':           '🌸',
  'ملابس':          '👗',
  'أحذية':          '👠',
  'حقائب':          '👜',
  'مجوهرات':        '💍',
  'إكسسوارات':      '✨',
  'منزل':           '🏠',
  'أدوات منزلية':   '🔧',
  'إلكترونيات':     '📱',
  'عناية':          '💄',
  'عناية شخصية':    '💆',
  'مستلزمات':       '📦',
  'طعام':           '🍱',
  'رياضة':          '⚽',
  'ألعاب':          '🎮',
  'كتب':            '📚',
  'هدايا':          '🎁',
}
const getCatEmoji = (cat: string) => CATEGORY_EMOJI[cat] ?? '🏷️'

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
  const { syncWithProducts, items, count } = useCart()
  const cartTotal = items.reduce((s, i) => s + i.product.sellEgp * i.quantity, 0)
  const moneyCart = (n: number) => n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
  const [products, setProducts] = useState<Product[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('الكل')
  const [search, setSearch] = useState<string>('')
  const [sort, setSort] = useState<SortOption>('default')

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

      {/* ── Hero Section (full-width, navy, with wave) ── */}
      <section className="-mx-4 bg-navy text-white relative overflow-hidden">
        {/* Subtle dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #C9A84C 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative px-5 pt-7 pb-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-gold text-sm font-bold mb-2 flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 bg-gold rounded-full" />
                تجربة تسوق سريعة ومباشرة
              </p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">الركن الخليجي</h1>
              <p className="text-white/70 text-sm sm:text-base mt-2 max-w-xl">
                اختار منتجاتك، راجع السلة، وأكد الطلب في خطوات قليلة.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 min-w-full sm:min-w-[280px]">
              <div className="rounded-xl bg-white/8 border border-white/10 p-3 text-center backdrop-blur-sm">
                <p className="text-2xl mb-0.5">📦</p>
                <p className="text-lg font-black leading-none">{products.length}</p>
                <p className="text-[11px] text-white/60 mt-0.5">منتج</p>
              </div>
              <div className="rounded-xl bg-white/8 border border-white/10 p-3 text-center backdrop-blur-sm">
                <p className="text-2xl mb-0.5">🏷️</p>
                <p className="text-lg font-black leading-none">{categories.length - 1}</p>
                <p className="text-[11px] text-white/60 mt-0.5">قسم</p>
              </div>
              <div className="rounded-xl bg-white/8 border border-white/10 p-3 text-center backdrop-blur-sm">
                <p className="text-2xl mb-0.5">⚡</p>
                <p className="text-lg font-black leading-none">{lowStockCount}</p>
                <p className="text-[11px] text-white/60 mt-0.5">محدود</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 1440 52" preserveAspectRatio="none" className="w-full block" style={{ height: 52, marginBottom: -1 }}>
          <path fill="#F8F6F0" d="M0,52 C240,20 480,52 720,32 C960,12 1200,48 1440,28 L1440,52 Z" />
        </svg>
      </section>

      {/* ── Sticky filter bar ── */}
      <section className="sticky top-16 z-40 -mx-4 px-4 py-3 bg-cream/95 backdrop-blur border-b border-gold/20 shadow-sm">
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
                  className={`whitespace-nowrap text-sm font-bold py-2 px-4 rounded-xl border transition-all duration-200 flex-shrink-0 flex items-center gap-1.5 ${
                    category === cat
                      ? 'bg-navy text-white border-navy shadow-sm'
                      : 'bg-white text-navy border-gold/35 hover:border-gold hover:bg-gold/5'
                  }`}
                >
                  <span>{getCatEmoji(cat)}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Products grid ── */}
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
          <div className="bg-white border border-gold/30 rounded-xl text-center py-16 px-4">
            <p className="text-4xl mb-3">🔍</p>
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

      {/* ── Bottom sticky cart bar ── */}
      {count > 0 && !editDraft && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div className="bg-navy/95 backdrop-blur border-t border-gold/20 px-4 py-3 shadow-[0_-8px_32px_rgba(7,31,61,0.35)]">
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs">{count} {count === 1 ? 'منتج' : 'منتجات'} في السلة</p>
                <p className="font-black text-gold text-base leading-tight">{moneyCart(cartTotal)}</p>
              </div>
              <Link
                href="/cart"
                className="bg-gold text-navy font-black px-5 py-2.5 rounded-xl text-sm whitespace-nowrap active:scale-95 transition-transform"
              >
                إتمام الطلب ←
              </Link>
            </div>
          </div>
        </div>
      )}

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
