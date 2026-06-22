'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Product, productImageSrc } from '@/lib/types'
import { useCart } from '@/context/CartContext'

export default function ProductCard({ product }: { product: Product }) {
  const { add, items } = useCart()
  const inCart = items.find(i => i.product.id === product.id)
  const imgSrc = productImageSrc(product)
  const [added, setAdded] = useState(false)

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  const handleAdd = () => {
    add(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  return (
    <div className="card flex flex-col overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group">
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
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-300">
              🛍️
            </div>
          )}
          {product.quantity > 0 && (
            <span className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-lg ${
              product.quantity <= 3 ? 'bg-amber-500' : 'bg-green-600'
            }`}>
              {product.quantity <= 3 ? `آخر ${product.quantity} قطع` : `${product.quantity} قطعة`}
            </span>
          )}
        </div>
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-bold text-navy text-sm leading-tight line-clamp-2 hover:text-gold transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.marketCategory && (
          <span className="text-xs text-gray-500">{product.marketCategory}</span>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <span className="text-gold font-black text-base">{money(product.sellEgp)}</span>

          <button
            onClick={handleAdd}
            className={`text-xs font-bold py-2 px-3 rounded-lg transition-all duration-300 active:scale-90 ${
              added
                ? 'bg-green-600 text-white scale-95'
                : inCart
                  ? 'bg-navy text-white'
                  : 'bg-gold text-navy hover:bg-gold-dark'
            }`}
          >
            {added ? '✓ تمت الإضافة' : inCart ? `في السلة (${inCart.quantity})` : 'أضف للسلة'}
          </button>
        </div>
      </div>
    </div>
  )
}
