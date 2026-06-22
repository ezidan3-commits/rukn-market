'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { doc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'
import { Product, productImageSrc } from '@/lib/types'
import { useCart } from '@/context/CartContext'
import ProductCard from '@/components/ProductCard'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { add, remove, updateQty, items } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const fetchedCategory = useRef<string | null>(null)

  const cartItem = items.find(i => i.product.id === id)
  const qty = cartItem?.quantity ?? 0
  const imgSrc = product ? productImageSrc(product) : null

  useEffect(() => {
    let unsub: (() => void) | undefined
    ensureAuth().then(() => {
      unsub = onSnapshot(doc(db, 'products', id), snap => {
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() } as Product
          if (p.visibleInMarket && p.quantity > 0) {
            setProduct(p)
            if (p.marketCategory && fetchedCategory.current !== p.marketCategory) {
              fetchedCategory.current = p.marketCategory
              getDocs(query(
                collection(db, 'products'),
                where('visibleInMarket', '==', true),
                where('marketCategory', '==', p.marketCategory),
                limit(5)
              )).then(result => {
                const list = result.docs
                  .map(d => ({ id: d.id, ...d.data() } as Product))
                  .filter(r => r.id !== id && r.quantity > 0)
                  .slice(0, 4)
                setRelated(list)
              })
            }
          } else {
            setProduct(null)
          }
        } else {
          setProduct(null)
        }
        setLoading(false)
      })
    })
    return () => unsub?.()
  }, [id])

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  const shareOnWhatsApp = () => {
    if (!product) return
    const url = window.location.href
    const text = `شوف المنتج ده 👇\n*${product.name}*\n${money(product.sellEgp)}\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

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

        {product.quantity > 0 && (
          <span className={`absolute top-3 right-3 text-white text-sm font-bold px-3 py-1 rounded-lg ${
            product.quantity <= 3 ? 'bg-amber-500' : 'bg-green-600'
          }`}>
            {product.quantity <= 3 ? `آخر ${product.quantity} قطع` : `${product.quantity} قطعة`}
          </span>
        )}

        {/* Share on WhatsApp */}
        <button
          onClick={shareOnWhatsApp}
          aria-label="مشاركة على واتساب"
          className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-green-600 rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-white transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.867-2.031-.967-.272-.099-.47-.148-.669.15-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </button>
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
      <div className="card p-4 mb-8">
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

      {/* Related products */}
      {related.length > 0 && (
        <div className="mb-8">
          <h2 className="font-black text-navy text-lg mb-3">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 gap-3">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
