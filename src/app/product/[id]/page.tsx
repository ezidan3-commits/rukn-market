'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'
import { Product, productImageSrc } from '@/lib/types'
import { useCart } from '@/context/CartContext'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { add, remove, updateQty, items } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const cartItem = items.find(i => i.product.id === id)
  const qty = cartItem?.quantity ?? 0
  const imgSrc = product ? productImageSrc(product) : null

  useEffect(() => {
    async function load() {
      await ensureAuth()
      const snap = await getDoc(doc(db, 'products', id))
      if (snap.exists()) {
        const p = { id: snap.id, ...snap.data() } as Product
        if (p.visibleInMarket && p.quantity > 0) setProduct(p)
        else setProduct(null)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-2xl mb-4">😕</p>
        <p className="font-bold text-navy mb-4">المنتج غير متاح</p>
        <Link href="/" className="btn-primary">العودة للمتجر</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-navy font-semibold text-sm mb-4 hover:text-gold">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        العودة
      </button>

      {/* Image */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-4">
        {imgSrc ? (
          imgSrc.startsWith('data:') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Image src={imgSrc} alt={product.name} fill className="object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">🛍️</div>
        )}
        {product.quantity <= 3 && (
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded-lg">
            آخر {product.quantity} قطع
          </span>
        )}
      </div>

      {/* Info */}
      <div className="card p-5 mb-4">
        {product.marketCategory && (
          <p className="text-xs text-gold font-bold mb-1">{product.marketCategory}</p>
        )}
        <h1 className="text-navy font-black text-xl mb-2">{product.name}</h1>
        <p className="text-gold font-black text-2xl mb-3">{money(product.sellEgp)}</p>
        {product.marketDescription && (
          <p className="text-gray-600 text-sm leading-relaxed">{product.marketDescription}</p>
        )}
      </div>

      {/* Add to cart */}
      <div className="card p-4">
        {qty === 0 ? (
          <button onClick={() => add(product)} className="btn-primary w-full text-center">
            أضف للسلة
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1 justify-center">
              <button
                onClick={() => qty === 1 ? remove(product.id) : updateQty(product.id, qty - 1)}
                className="w-10 h-10 rounded-full bg-navy text-white font-black text-xl flex items-center justify-center"
              >
                −
              </button>
              <span className="text-navy font-black text-xl w-8 text-center">{qty}</span>
              <button
                onClick={() => updateQty(product.id, qty + 1)}
                disabled={qty >= product.quantity}
                className="w-10 h-10 rounded-full bg-gold text-navy font-black text-xl flex items-center justify-center disabled:opacity-40"
              >
                +
              </button>
            </div>
            <Link href="/cart" className="btn-navy text-center">
              عرض السلة
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
