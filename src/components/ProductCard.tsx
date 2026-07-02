'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { trackProductEvent } from '@/lib/analytics'
import { Product, productImageSrc } from '@/lib/types'

function ProductFallbackIcon({ size = 'w-14 h-14' }: { size?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.36-1.36 1.1 10.43A2.25 2.25 0 0 1 18.47 22H5.53a2.25 2.25 0 0 1-2.24-2.43l1.1-10.43A2.25 2.25 0 0 1 6.63 7.1h10.74a2.25 2.25 0 0 1 2.24 2.04Z" />
    </svg>
  )
}

interface Props {
  product: Product
  // When true the card is in "add to order" mode instead of "add to cart"
  editOrderMode?: boolean
  draftQty?: number
  onAddToOrder?: (product: Product) => void
}

export default function ProductCard({ product, editOrderMode = false, draftQty = 0, onAddToOrder }: Props) {
  const { add, items } = useCart()
  const inCart = items.find(i => i.product.id === product.id)
  const imgSrc = productImageSrc(product)
  const [justAdded, setJustAdded] = useState(false)

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  const handleAddToCart = () => {
    add(product)
    trackProductEvent(product, 'cart_add')
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

          <span className={`absolute top-2 right-2 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-sm ${
            product.quantity <= 3 ? 'bg-amber-500' : 'bg-green-600'
          }`}>
            {product.quantity === 1 ? 'آخر قطعة' : product.quantity <= 3 ? `آخر ${product.quantity} قطع` : 'متاح'}
          </span>

          {/* Badge: quantity already in the order draft */}
          {editOrderMode && draftQty > 0 && (
            <span className="absolute top-2 left-2 bg-navy text-white text-[11px] font-black px-2 py-1 rounded-md shadow-sm">
              × {draftQty}
            </span>
          )}
        </div>
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {product.marketCategory && (
          <span className="text-[11px] text-gray-500 font-semibold truncate">{product.marketCategory}</span>
        )}

        <Link href={`/product/${product.id}`} className="min-h-[40px]">
          <h3 className="font-black text-navy text-sm leading-5 line-clamp-2 hover:text-gold transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-gold font-black text-base">{money(product.sellEgp)}</span>
            {/* Cart count badge — only in normal mode */}
            {!editOrderMode && inCart && (
              <span className="text-[11px] text-navy font-bold bg-navy/5 px-2 py-1 rounded-md">× {inCart.quantity}</span>
            )}
          </div>

          {editOrderMode ? (
            /* Add-to-order button */
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
            /* Normal add-to-cart button */
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
