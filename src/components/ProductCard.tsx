'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Product, productImageSrc } from '@/lib/types'
import { useCart } from '@/context/CartContext'

export default function ProductCard({ product }: { product: Product }) {
  const { add, items } = useCart()
  const inCart = items.find(i => i.product.id === product.id)
  const imgSrc = productImageSrc(product)

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  return (
    <div className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative w-full aspect-square bg-gray-50">
          {imgSrc ? (
            imgSrc.startsWith('data:') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Image
                src={imgSrc}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🛍️</div>
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
            onClick={() => add(product)}
            className={`text-xs font-bold py-2 px-3 rounded-lg transition-all active:scale-95 ${
              inCart
                ? 'bg-navy text-white'
                : 'bg-gold text-navy hover:bg-gold-dark'
            }`}
          >
            {inCart ? `في السلة (${inCart.quantity})` : 'أضف للسلة'}
          </button>
        </div>
      </div>
    </div>
  )
}
