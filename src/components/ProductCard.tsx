'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { trackProductEvent } from '@/lib/analytics'
import { Product, productImageSrc, effectivePrice, hasActiveDiscount } from '@/lib/types'

function ProductFallbackIcon({ size = 'w-14 h-14' }: { size?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.36-1.36 1.1 10.43A2.25 2.25 0 0 1 18.47 22H5.53a2.25 2.25 0 0 1-2.24-2.43l1.1-10.43A2.25 2.25 0 0 1 6.63 7.1h10.74a2.25 2.25 0 0 1 2.24 2.04Z" />
    </svg>
  )
}

interface Props {
  product: Product
  editOrderMode?: boolean
  draftQty?: number
  onAddToOrder?: (product: Product) => void
}

export default function ProductCard({ product, editOrderMode = false, draftQty = 0, onAddToOrder }: Props) {
  const { add, items } = useCart()
  const { showToast } = useToast()
  const inCart = items.find(i => i.product.id === product.id)
  const imgSrc = productImageSrc(product)
  const [justAdded, setJustAdded] = useState(false)
  const [liked, setLiked] = useState(false)

  const isLowStock = product.quantity > 0 && product.quantity <= 3
  const onSale = hasActiveDiscount(product)
  const price = effectivePrice(product)

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  const handleAddToCart = () => {
    add(product)
    trackProductEvent(product, 'cart_add')
    showToast(product.name, imgSrc || undefined)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  const handleAddToOrder = () => {
    onAddToOrder?.(product)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <article className="card flex flex-col overflow-hidden group">
      <Link href={`/product/${product.id}`} className="block overflow-hidden">
        <div className="relative w-full aspect-square bg-gray-50">
          {imgSrc ? (
            imgSrc.startsWith('data:') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <Image
                src={imgSrc}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-navy/35 bg-gradient-to-br from-white to-cream">
              <ProductFallbackIcon />
            </div>
          )}

          {/* Availability / urgency badge */}
          <span className={`absolute top-2 right-2 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-sm ${
            product.quantity === 1
              ? 'bg-red-600 animate-pulse'
              : product.quantity <= 3
                ? 'bg-amber-500 animate-pulse'
                : 'bg-green-600'
          }`}>
            {product.quantity === 1
              ? '⚡ آخر قطعة!'
              : product.quantity <= 3
                ? `⚡ آخر ${product.quantity} قطع!`
                : 'متاح'}
          </span>

          {/* Discount badge — ticket-cut shape */}
          {onSale && (
            <span className={`absolute left-2 bg-navy text-gold text-[11px] font-black pr-2.5 pl-2 py-1 shadow-sm ${
              !editOrderMode || draftQty > 0 ? 'top-11' : 'top-2'
            }`} style={{ borderRadius: '6px 2px 2px 6px' }}>
              🔥 خصم {product.discountPercent}%
            </span>
          )}

          {/* Heart wishlist button — normal mode only */}
          {!editOrderMode && (
            <button
              onClick={e => { e.preventDefault(); setLiked(l => !l) }}
              aria-label="أضف للمفضلة"
              className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-transform active:scale-90 hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-colors duration-200 ${liked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-400'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
            </button>
          )}

          {/* Draft quantity badge — edit-order mode */}
          {editOrderMode && draftQty > 0 && (
            <span className="absolute top-2 left-2 bg-navy text-white text-[11px] font-black px-2 py-1 rounded-md shadow-sm">
              × {draftQty}
            </span>
          )}

          {/* Price overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-navy/75 via-navy/30 to-transparent px-3 pt-6 pb-2 flex items-end justify-between">
            <span className="flex items-baseline gap-1.5">
              <span className="text-white font-black text-base drop-shadow">{money(price)}</span>
              {onSale && (
                <span className="text-white/60 text-[11px] line-through">{money(product.sellEgp)}</span>
              )}
            </span>
            {!editOrderMode && inCart && (
              <span className="text-[11px] text-white font-bold bg-gold/80 px-2 py-0.5 rounded-md">
                × {inCart.quantity}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {product.marketCategory && (
          <span className="text-[11px] text-gray-500 font-semibold truncate">{product.marketCategory}</span>
        )}

        <Link href={`/product/${product.id}`} className="flex-1">
          <h3 className="font-black text-navy text-sm leading-5 line-clamp-2 hover:text-gold transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Low-stock urgency text */}
        {isLowStock && !editOrderMode && (
          <p className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            الكمية محدودة — اطلب الآن
          </p>
        )}

        <div className="mt-auto">
          {editOrderMode ? (
            <button
              onClick={handleAddToOrder}
              className={`w-full text-xs font-black py-2.5 px-3 rounded-lg transition-all duration-200 active:scale-[0.98] ${
                justAdded
                  ? 'bg-green-600 text-white'
                  : draftQty > 0
                    ? 'bg-navy text-white hover:bg-navy/90'
                    : 'bg-gold text-navy hover:bg-gold-dark'
              }`}
            >
              {justAdded ? 'تمت الإضافة ✓' : draftQty > 0 ? `أضف قطعة أخرى (${draftQty})` : 'أضف للطلب'}
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className={`w-full text-xs font-black py-2.5 px-3 rounded-lg transition-all duration-200 active:scale-[0.98] ${
                justAdded
                  ? 'bg-green-600 text-white'
                  : inCart
                    ? 'bg-navy text-white hover:bg-navy-light'
                    : 'bg-gold text-navy hover:bg-gold-dark'
              }`}
            >
              {justAdded ? 'تمت الإضافة' : inCart ? 'أضف قطعة أخرى' : 'أضف للسلة'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
