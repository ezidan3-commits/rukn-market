'use client'
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'
import { Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('الكل')
  const [search, setSearch] = useState<string>('')

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
          .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-navy font-semibold">جاري تحميل المنتجات...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-navy rounded-2xl p-6 mb-6 text-center">
        <h1 className="text-white font-black text-2xl mb-1">الركن الخليجي</h1>
        <p className="text-gold text-sm">ستور السعاده</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن منتج..."
          className="w-full border border-gold/40 rounded-full py-2 pr-10 pl-4 text-sm text-navy font-semibold outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white"
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

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap text-sm font-bold py-2 px-4 rounded-full border transition-all flex-shrink-0 ${
                category === cat
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-navy border-gold/40 hover:border-gold'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 font-semibold">
          {search.trim() ? `لا توجد نتائج لـ "${search}"` : 'لا توجد منتجات متاحة حالياً'}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">{filtered.length} منتج متاح</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
