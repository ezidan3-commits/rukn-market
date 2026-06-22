'use client'
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'
import { Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'

type SortOption = 'default' | 'price_asc' | 'price_desc'

function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('الكل')
  const [search, setSearch] = useState<string>('')
  const [sort, setSort] = useState<SortOption>('default')

  useEffect(() => {
    let unsub: (() => void) | undefined
    ensureAuth().then(() => {
      const q = query(
        collection(db, 'products'),
        where('visibleInMarket', '==', true)
      )
      unsub = onSnapshot(q, snap => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.quantity > 0)
        setProducts(list)
        setLoading(false)
      })
    })
    return () => unsub?.()
  }, [])

  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.marketCategory).filter(Boolean)))]

  const filtered = products
    .filter(p => category === 'الكل' || p.marketCategory === category)
    .filter(p => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price_asc') return a.sellEgp - b.sellEgp
      if (sort === 'price_desc') return b.sellEgp - a.sellEgp
      return a.name.localeCompare(b.name, 'ar')
    })

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-6 mb-6 text-center overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gold/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-gold/10" />
        <div className="absolute top-2 left-10 w-14 h-14 rounded-full bg-white/5" />
        <div className="absolute bottom-3 right-16 w-8 h-8 rounded-full bg-gold/20" />
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-white font-black text-3xl mb-1">ستور السعاده</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="w-8 h-px bg-gold/50" />
            <p className="text-gold text-sm font-semibold">تسوق بسعادة وراحة</p>
            <div className="w-8 h-px bg-gold/50" />
          </div>
        </div>
      </div>

      {/* Sticky Search + Category */}
      <div className="sticky top-16 z-40 bg-cream pb-3 pt-1">
        <div className="relative mb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full border border-gold/40 rounded-full py-2.5 pr-10 pl-4 text-sm text-navy font-semibold outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white shadow-sm"
            dir="rtl"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gold text-lg pointer-events-none">🔍</span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap text-sm font-bold py-2 px-4 rounded-full border transition-all duration-200 flex-shrink-0 ${
                  category === cat
                    ? 'bg-navy text-white border-navy shadow-md'
                    : 'bg-white text-navy border-gold/40 hover:border-gold'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Count + Sort */}
      {!loading && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">{filtered.length} منتج متاح</p>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="text-xs font-bold text-navy border border-gold/40 rounded-full py-1.5 px-3 bg-white outline-none focus:border-gold cursor-pointer"
            dir="rtl"
          >
            <option value="default">ترتيب: افتراضي</option>
            <option value="price_asc">الأرخص أولاً</option>
            <option value="price_desc">الأغلى أولاً</option>
          </select>
        </div>
      )}

      {/* Skeleton / Products / Empty */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 font-semibold">
          {search.trim() ? `لا توجد نتائج لـ "${search}"` : 'لا توجد منتجات متاحة حالياً'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gold/20 text-center pb-6">
        <p className="font-black text-navy text-lg mb-1">ستور السعاده</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a
            href="https://wa.me/201210729036"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 transition-colors font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.031-.967-.272-.099-.47-.148-.669.15-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            واتساب
          </a>
          <span className="text-gray-300">|</span>
          <a
            href="https://www.facebook.com/groups/618310885443604/?ref=share&mibextid=NSMWBT"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1877F2] transition-colors font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#1877F2]">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            فيسبوك
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-3">جميع الحقوق محفوظة © 2025</p>
      </footer>
    </div>
  )
}
