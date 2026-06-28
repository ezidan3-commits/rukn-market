'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { collection, doc, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore'
import ProductCard from '@/components/ProductCard'
import { useCart } from '@/context/CartContext'
import { db, ensureAuth } from '@/lib/firebase'
import { trackProductEvent } from '@/lib/analytics'
import { Product, productImageSources } from '@/lib/types'

function ProductFallback({ large = false }: { large?: boolean }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-navy/35 bg-gradient-to-br from-white to-cream">
      <svg xmlns="http://www.w3.org/2000/svg" className={large ? 'w-24 h-24' : 'w-12 h-12'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.36-1.36 1.1 10.43A2.25 2.25 0 0 1 18.47 22H5.53a2.25 2.25 0 0 1-2.24-2.43l1.1-10.43A2.25 2.25 0 0 1 6.63 7.1h10.74a2.25 2.25 0 0 1 2.24 2.04Z" />
      </svg>
    </div>
  )
}

export default function ProductDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { add, remove, updateQty, items } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState('')
  const trackedView = useRef<string | null>(null)
  const fetchedCategory = useRef<string | null>(null)

  const cartItem = items.find(i => i.product.id === id)
  const qty = cartItem?.quantity ?? 0
  const images = product ? productImageSources(product) : []
  const activeImage = selectedImage || images[0] || ''

  useEffect(() => {
    let unsub: (() => void) | undefined
    ensureAuth().then(() => {
      unsub = onSnapshot(doc(db, 'products', id), snap => {
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() } as Product
          if (p.visibleInMarket && p.quantity > 0) {
            setProduct(p)
            setSelectedImage(current => current || productImageSources(p)[0] || '')
            if (trackedView.current !== p.id) {
              trackedView.current = p.id
              trackProductEvent(p, 'view')
            }
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

  const addToCart = () => {
    if (!product) return
    add(product)
    trackProductEvent(product, 'cart_add')
  }

  const shareOnWhatsApp = () => {
    if (!product) return
    const url = window.location.href
    const text = `شوف المنتج ده\n*${product.name}*\n${money(product.sellEgp)}\n\n${url}`
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
      <div className="max-w-md mx-auto bg-white border border-gold/30 rounded-lg text-center py-16 px-4">
        <p className="font-black text-navy text-xl mb-2">المنتج غير متاح</p>
        <p className="text-gray-500 text-sm mb-6">ربما تم إخفاء المنتج أو نفدت الكمية المتاحة.</p>
        <Link href="/" className="btn-primary">العودة للمتجر</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-navy font-bold text-sm hover:text-gold">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        العودة
      </button>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-white border border-gold/30">
            {activeImage ? (
              activeImage.startsWith('data:') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Image src={activeImage} alt={product.name} fill className="object-cover" priority />
              )
            ) : (
              <ProductFallback large />
            )}

            <span className={`absolute top-3 right-3 text-white text-sm font-bold px-3 py-1 rounded-md shadow-sm ${
              product.quantity <= 3 ? 'bg-amber-500' : 'bg-green-600'
            }`}>
              {product.quantity <= 3 ? `آخر ${product.quantity} قطع` : `${product.quantity} قطعة متاحة`}
            </span>
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(0, 5).map(image => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`relative aspect-square overflow-hidden rounded-lg border bg-white ${
                    image === activeImage ? 'border-navy ring-2 ring-navy/15' : 'border-gold/30'
                  }`}
                  aria-label="عرض صورة المنتج"
                >
                  {image.startsWith('data:') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image src={image} alt="" fill className="object-cover" sizes="80px" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            {product.marketCategory && (
              <p className="text-xs text-gold font-black mb-2">{product.marketCategory}</p>
            )}
            <h1 className="text-navy font-black text-2xl leading-8 mb-3">{product.name}</h1>
            <p className="text-gold font-black text-3xl mb-4">{money(product.sellEgp)}</p>
            {product.marketDescription ? (
              <p className="text-gray-600 text-sm leading-7">{product.marketDescription}</p>
            ) : (
              <p className="text-gray-500 text-sm leading-7">منتج متاح للطلب من الركن الخليجي. أضفه للسلة وأكمل بياناتك لتأكيد الطلب.</p>
            )}
          </div>

          <div className="card p-4">
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="rounded-lg bg-cream border border-gold/20 p-3">
                <p className="text-navy font-black text-lg">{product.quantity}</p>
                <p className="text-[11px] text-gray-500">متاح</p>
              </div>
              <div className="rounded-lg bg-cream border border-gold/20 p-3">
                <p className="text-navy font-black text-lg">سريع</p>
                <p className="text-[11px] text-gray-500">تأكيد</p>
              </div>
              <div className="rounded-lg bg-cream border border-gold/20 p-3">
                <p className="text-navy font-black text-lg">آمن</p>
                <p className="text-[11px] text-gray-500">طلبك</p>
              </div>
            </div>

            {qty === 0 ? (
              <button onClick={addToCart} className="btn-primary w-full text-center">
                أضف للسلة
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => qty === 1 ? remove(product.id) : updateQty(product.id, qty - 1)}
                    className="w-11 h-11 rounded-lg bg-navy text-white font-black text-xl flex items-center justify-center"
                    aria-label="تقليل الكمية"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <p className="text-navy font-black text-2xl">{qty}</p>
                    <p className="text-xs text-gray-500">في السلة</p>
                  </div>
                  <button
                    onClick={() => updateQty(product.id, qty + 1)}
                    disabled={qty >= product.quantity}
                    className="w-11 h-11 rounded-lg bg-gold text-navy font-black text-xl flex items-center justify-center disabled:opacity-40"
                    aria-label="زيادة الكمية"
                  >
                    +
                  </button>
                </div>
                <Link href="/cart" className="btn-navy block text-center">
                  عرض السلة
                </Link>
              </div>
            )}

            <button
              onClick={shareOnWhatsApp}
              className="w-full mt-3 border border-green-500 text-green-700 bg-green-50 hover:bg-green-100 font-bold py-3 px-4 rounded-lg transition-colors"
            >
              مشاركة المنتج على واتساب
            </button>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="font-black text-navy text-xl">منتجات مشابهة</h2>
              <p className="text-gray-500 text-xs mt-1">اختيارات قريبة من نفس القسم</p>
            </div>
            <Link href="/" className="text-sm font-bold text-navy hover:text-gold">كل المنتجات</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-gold/30 p-3 shadow-[0_-8px_24px_rgba(7,31,61,0.12)] lg:hidden">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{product.name}</p>
            <p className="font-black text-gold">{money(product.sellEgp)}</p>
          </div>
          {qty === 0 ? (
            <button onClick={addToCart} className="btn-primary py-3 px-5">
              أضف للسلة
            </button>
          ) : (
            <Link href="/cart" className="btn-navy py-3 px-5">
              السلة ({qty})
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
