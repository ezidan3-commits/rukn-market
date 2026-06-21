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
  const filtered = category === 'الكل' ? products : products.filter(p => p.marketCategory === category)

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
        <p className="text-gold text-sm">منتجات خليجية أصيلة بأسعار مميزة</p>
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
          لا توجد منتجات متاحة حالياً
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
