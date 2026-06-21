'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { productImageSrc } from '@/lib/types'

export default function CartPage() {
  const { items, remove, updateQty, total } = useCart()

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🛒</p>
        <p className="font-black text-navy text-xl mb-2">السلة فارغة</p>
        <p className="text-gray-500 text-sm mb-6">أضف منتجات لتبدأ طلبك</p>
        <Link href="/" className="btn-primary">تصفح المنتجات</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-black text-navy text-xl mb-4">سلة التسوق ({items.length})</h1>

      <div className="flex flex-col gap-3 mb-4">
        {items.map(({ product, quantity }) => {
          const imgSrc = productImageSrc(product)
          return (
            <div key={product.id} className="card p-3 flex gap-3 items-center">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                {imgSrc ? (
                  imgSrc.startsWith('data:') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Image src={imgSrc} alt={product.name} fill className="object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy text-sm leading-tight line-clamp-1">{product.name}</p>
                <p className="text-gold font-black text-sm mt-0.5">{money(product.sellEgp)}</p>
                <p className="text-xs text-gray-400">{money(product.sellEgp * quantity)} إجمالي</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => quantity === 1 ? remove(product.id) : updateQty(product.id, quantity - 1)}
                  className="w-8 h-8 rounded-full bg-navy text-white font-black text-lg flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-6 text-center font-black text-navy">{quantity}</span>
                <button
                  onClick={() => updateQty(product.id, quantity + 1)}
                  disabled={quantity >= product.quantity}
                  className="w-8 h-8 rounded-full bg-gold text-navy font-black text-lg flex items-center justify-center disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-navy text-lg">الإجمالي</span>
          <span className="font-black text-gold text-2xl">{money(total)}</span>
        </div>
      </div>

      <Link href="/checkout" className="btn-primary block text-center w-full">
        متابعة الطلب
      </Link>
    </div>
  )
}
