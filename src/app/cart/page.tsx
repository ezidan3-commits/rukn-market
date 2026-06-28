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
      <div className="max-w-md mx-auto bg-white border border-gold/30 rounded-lg text-center py-16 px-4">
        <div className="w-16 h-16 rounded-lg bg-cream border border-gold/20 mx-auto mb-4 flex items-center justify-center text-navy">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.39a1.5 1.5 0 0 1 1.46 1.16l.36 1.54m0 0h14.29l-1.5 7.5a2.25 2.25 0 0 1-2.2 1.8H8.05a2.25 2.25 0 0 1-2.2-1.8L5.46 5.7Zm3.04 13.05h.01m8.99 0h.01" />
          </svg>
        </div>
        <p className="font-black text-navy text-xl mb-2">السلة فارغة</p>
        <p className="text-gray-500 text-sm mb-6">أضف منتجات لتبدأ طلبك.</p>
        <Link href="/" className="btn-primary">تصفح المنتجات</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-black text-navy text-2xl">سلة التسوق</h1>
            <p className="text-gray-500 text-sm mt-1">{items.length} منتج في السلة</p>
          </div>
          <Link href="/" className="text-sm font-bold text-navy hover:text-gold">متابعة التسوق</Link>
        </div>

        <div className="flex flex-col gap-3">
          {items.map(({ product, quantity }) => {
            const imgSrc = productImageSrc(product)
            return (
              <div key={product.id} className="card p-3 flex gap-3 items-center">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gold/20">
                  {imgSrc ? (
                    imgSrc.startsWith('data:') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgSrc} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Image src={imgSrc} alt={product.name} fill className="object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-navy/35">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.36-1.36 1.1 10.43A2.25 2.25 0 0 1 18.47 22H5.53a2.25 2.25 0 0 1-2.24-2.43l1.1-10.43A2.25 2.25 0 0 1 6.63 7.1h10.74a2.25 2.25 0 0 1 2.24 2.04Z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-navy text-sm leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-gold font-black text-sm mt-1">{money(product.sellEgp)}</p>
                  <p className="text-xs text-gray-400">{money(product.sellEgp * quantity)} إجمالي</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => quantity === 1 ? remove(product.id) : updateQty(product.id, quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-navy text-white font-black text-lg flex items-center justify-center"
                    aria-label="تقليل الكمية"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-black text-navy">{quantity}</span>
                  <button
                    onClick={() => updateQty(product.id, quantity + 1)}
                    disabled={quantity >= product.quantity}
                    className="w-8 h-8 rounded-lg bg-gold text-navy font-black text-lg flex items-center justify-center disabled:opacity-40"
                    aria-label="زيادة الكمية"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <aside className="card p-4 lg:sticky lg:top-24">
        <p className="font-black text-navy mb-3">ملخص السلة</p>
        <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
          <span>عدد القطع</span>
          <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </div>
        <div className="border-t border-gold/20 pt-3 mt-3 flex justify-between items-center">
          <span className="font-bold text-navy text-lg">الإجمالي</span>
          <span className="font-black text-gold text-2xl">{money(total)}</span>
        </div>
        <Link href="/checkout" className="btn-primary block text-center w-full mt-4">
          متابعة الطلب
        </Link>
      </aside>
    </div>
  )
}
