'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import ProductCard from '@/components/ProductCard'
import ScrollRevealGrid from '@/components/ScrollRevealGrid'
import { useCart } from '@/context/CartContext'
import { db, ensureAuth } from '@/lib/firebase'
import { Product, ProductCategory, productImageSrc, effectivePrice, hasActiveDiscount } from '@/lib/types'
import { DRAFT_KEY, type DraftItem, type EditOrderDraft } from '@/lib/edit-order'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

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
  const { syncWithProducts, items, count } = useCart()
  const cartTotal = items.reduce((s, i) => s + effectivePrice(i.product) * i.quantity, 0)
  const moneyCart = (n: number) => n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
  const [products, setProducts] = useState<Product[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('الكل')
  const [search, setSearch] = useState<string>('')
  const [sort, setSort] = useState<SortOption>('default')
  const [offersOnly, setOffersOnly] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)

  const { items: recentItems } = useRecentlyViewed()

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
        where('visibleInMarket', '==', true)
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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'الكل': products.length }
    for (const p of products) {
      const cat = (p.categoryId && categoryMap[p.categoryId]) || p.marketCategory || ''
      if (!cat) continue
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    return counts
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
      .filter(p => !offersOnly || hasActiveDiscount(p))
      .sort((a, b) => {
        if (sort === 'price_asc') return effectivePrice(a) - effectivePrice(b)
        if (sort === 'price_desc') return effectivePrice(b) - effectivePrice(a)
        return a.name.localeCompare(b.name, 'ar')
      })
  }, [products, category, search, sort, categoryMap, offersOnly])

  const lowStockCount = useMemo(
    () => products.filter(p => p.quantity > 0 && p.quantity <= 3).length,
    [products]
  )

  const activeOffersCount = useMemo(
    () => products.filter(hasActiveDiscount).length,
    [products]
  )

  const searchDropdownResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6)
  }, [search, products])

  useEffect(() => {
    if (!showDropdown) return
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showDropdown])

  useEffect(() => {
    if (!showCategoryMenu) return
    function handle(e: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setShowCategoryMenu(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showCategoryMenu])

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

      {/* ── Hero Section (dark ember atmosphere, with wave) ── */}
      <section className="-mx-4 bg-navy text-white relative overflow-hidden">
        {/* Ember glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 480px 300px at 85% -10%, rgba(217,123,46,0.28), transparent 65%), ' +
              'radial-gradient(ellipse 380px 260px at 5% 15%, rgba(240,164,98,0.14), transparent 60%)',
          }}
        />

        <div className="relative px-5 pt-8 pb-3">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-gold text-xs font-bold mb-3 flex items-center gap-2 tracking-wide">
                <span className="inline-block w-5 h-px bg-gold" />
                تجربة ضيافة خليجية أصيلة
              </p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">
                دفء الضيافة <span className="text-gold">يبدأ من هنا</span>
              </h1>
              <p className="text-white/60 text-sm sm:text-base mt-3 max-w-xl leading-7">
                بخور، عطور، وأطقم قهوة مختارة بعناية — اختار منتجاتك وأكد الطلب في خطوات قليلة.
              </p>
              {activeOffersCount > 0 && (
                <button
                  onClick={() => {
                    setOffersOnly(true)
                    setCategory('الكل')
                    document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-navy bg-gold px-3.5 py-2 rounded-lg hover:bg-gold-light transition-colors"
                >
                  🔥 {activeOffersCount} عرض نشط الآن ←
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 min-w-full sm:min-w-[280px]">
              <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 text-center backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5 mx-auto mb-1 text-gold" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M4 7l8-4 8 4v10l-8 4-8-4z" strokeLinejoin="round" /><path d="M4 7l8 4 8-4M12 11v10" strokeLinejoin="round" /></svg>
                <p className="text-lg font-black leading-none">{products.length}</p>
                <p className="text-[11px] text-white/50 mt-1">منتج</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 text-center backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5 mx-auto mb-1 text-gold" fill="none" stroke="currentColor" strokeWidth={1.6}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>
                <p className="text-lg font-black leading-none">{categories.length - 1}</p>
                <p className="text-[11px] text-white/50 mt-1">قسم</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3 text-center backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5 mx-auto mb-1 text-gold" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M13 2 4 14h6l-1 8 9-12h-6z" strokeLinejoin="round" /></svg>
                <p className="text-lg font-black leading-none">{activeOffersCount}</p>
                <p className="text-[11px] text-white/50 mt-1">عرض نشط</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 1440 52" preserveAspectRatio="none" className="w-full block" style={{ height: 52, marginBottom: -1 }}>
          <path fill="#F5EEE2" d="M0,52 C240,20 480,52 720,32 C960,12 1200,48 1440,28 L1440,52 Z" />
        </svg>
      </section>

      {/* ── Sticky filter bar ── */}
      <section className="sticky top-16 z-40 -mx-4 px-4 py-3 bg-cream/95 backdrop-blur border-b border-gold/20 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
            <div className="relative" ref={searchRef}>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => search && setShowDropdown(true)}
                placeholder="ابحث باسم المنتج..."
                className="w-full border border-gold/40 rounded-lg py-3 pr-11 pl-10 text-sm text-navy font-semibold outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white shadow-sm"
                dir="rtl"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
              </svg>
              {search && (
                <button
                  onClick={() => { setSearch(''); setShowDropdown(false) }}
                  aria-label="مسح البحث"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy text-lg font-bold"
                >
                  ×
                </button>
              )}

              {/* Search dropdown */}
              {showDropdown && searchDropdownResults.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-gold/30 rounded-xl shadow-xl z-50 overflow-hidden">
                  {searchDropdownResults.map(p => {
                    const img = productImageSrc(p)
                    return (
                      <Link
                        key={p.id}
                        href={`/product/${p.id}`}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gold/20">
                          {img ? (
                            img.startsWith('data:') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Image src={img} alt="" width={40} height={40} className="object-cover w-full h-full" />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-navy/30 text-lg">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-navy font-bold text-sm truncate">{p.name}</p>
                          <p className="text-gold text-xs font-black">{p.sellEgp.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </Link>
                    )
                  })}
                </div>
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
            <div className="relative" ref={categoryMenuRef}>
              <button
                onClick={() => setShowCategoryMenu(v => !v)}
                className="flex items-center justify-between gap-3 bg-white border border-gold/25 rounded-xl px-4 py-3 max-w-[260px] w-full sm:w-auto hover:border-gold/50 transition-colors"
              >
                <span className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-gray-400 flex-shrink-0">القسم</span>
                  <span className="text-sm font-black text-navy truncate">{category}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-4 h-4 text-gold-dark flex-shrink-0 transition-transform duration-200 ${showCategoryMenu ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {showCategoryMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gold/20 rounded-xl shadow-xl overflow-hidden z-50">
                  {categories.map(cat => {
                    const active = category === cat
                    return (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setShowCategoryMenu(false) }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                          active ? 'bg-cream text-navy font-black' : 'text-gray-600 font-bold hover:bg-cream/50'
                        }`}
                      >
                        <span>{cat}</span>
                        <span className={`text-[11px] ${active ? 'text-gold-dark' : 'text-gray-400'}`}>
                          {categoryCounts[cat] ?? 0}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Recently Viewed ── */}
      {!loading && recentItems.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-navy text-base font-black">شاهدتها مؤخراً</h2>
            <span className="text-xs text-gray-400">{recentItems.length} منتج</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentItems.map(item => {
              const img = item.imageUrl
              return (
                <Link key={item.id} href={`/product/${item.id}`} className="flex-shrink-0 w-32 card overflow-hidden hover:-translate-y-0.5 transition-transform">
                  <div className="h-28 bg-gray-50 relative overflow-hidden">
                    {img ? (
                      img.startsWith('data:') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Image src={img} alt={item.name} fill className="object-cover" sizes="128px" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-navy/25 text-3xl">📦</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-navy font-bold text-xs leading-tight line-clamp-2">{item.name}</p>
                    <p className="text-gold font-black text-xs mt-1">{item.sellEgp.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Products grid ── */}
      <section id="offers">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-navy text-xl font-black">{offersOnly ? 'العروض النشطة' : 'المنتجات'}</h2>
            {!loading && (
              <p className="text-xs text-gray-500 mt-1">
                {filtered.length} نتيجة متاحة{category !== 'الكل' ? ` في ${category}` : ''}
              </p>
            )}
          </div>
          {offersOnly && (
            <button
              onClick={() => setOffersOnly(false)}
              className="text-xs font-bold text-gold hover:text-gold-dark flex-shrink-0"
            >
              ✕ عرض كل المنتجات
            </button>
          )}
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
          <ScrollRevealGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                editOrderMode={!!editDraft}
                draftQty={editDraft?.draftItems.find(d => d.productId === p.id)?.quantity ?? 0}
                onAddToOrder={handleAddToOrder}
              />
            ))}
          </ScrollRevealGrid>
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
