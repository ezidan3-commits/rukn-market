'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'

interface ProductStat {
  productId: string
  productName: string
  views: number
  cartAdds: number
  lastSeenAt: { seconds: number } | null
}

export default function InsightsPage() {
  const [items, setItems] = useState<ProductStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ensureAuth().then(() =>
      getDocs(query(collection(db, 'analytics'), orderBy('views', 'desc')))
    ).then(snap => {
      setItems(snap.docs.map(d => d.data() as ProductStat))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totals = items.reduce(
    (acc, item) => ({ views: acc.views + (item.views || 0), cartAdds: acc.cartAdds + (item.cartAdds || 0) }),
    { views: 0, cartAdds: 0 }
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-navy text-2xl font-black">إحصائيات المتجر</h1>
          <p className="text-gray-500 text-sm mt-1">مشاهدات المنتجات والإضافات للسلة من كل الزوار.</p>
        </div>
        <Link href="/" className="btn-navy py-2 px-4 text-sm">المتجر</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-gray-500 text-sm">إجمالي المشاهدات</p>
          <p className="text-navy text-3xl font-black mt-1">{totals.views.toLocaleString('ar-EG')}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-500 text-sm">إضافات للسلة</p>
          <p className="text-navy text-3xl font-black mt-1">{totals.cartAdds.toLocaleString('ar-EG')}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gold/20">
          <p className="font-black text-navy">أعلى المنتجات تفاعلًا</p>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-bold text-navy mb-1">لا توجد بيانات بعد</p>
            <p className="text-gray-500 text-sm">افتح بعض المنتجات أو أضف منتجات للسلة لتظهر الإحصائيات هنا.</p>
          </div>
        ) : (
          <div className="divide-y divide-gold/10">
            {items.map(item => (
              <div key={item.productId} className="p-4 grid gap-2 sm:grid-cols-[1fr_110px_110px] sm:items-center">
                <div>
                  <p className="font-black text-navy">{item.productName}</p>
                  {item.lastSeenAt && (
                    <p className="text-xs text-gray-500">
                      آخر تفاعل: {new Date(item.lastSeenAt.seconds * 1000).toLocaleString('ar-EG')}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-600">مشاهدات: <span className="font-black text-navy">{(item.views || 0).toLocaleString('ar-EG')}</span></p>
                <p className="text-sm text-gray-600">سلة: <span className="font-black text-navy">{(item.cartAdds || 0).toLocaleString('ar-EG')}</span></p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
