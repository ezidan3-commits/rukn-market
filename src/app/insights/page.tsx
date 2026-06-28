'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getProductAnalytics, ProductAnalytics } from '@/lib/analytics'

export default function InsightsPage() {
  const [items, setItems] = useState<ProductAnalytics[]>([])

  useEffect(() => {
    setItems(getProductAnalytics())
  }, [])

  const totals = useMemo(() => ({
    views: items.reduce((sum, item) => sum + item.views, 0),
    cartAdds: items.reduce((sum, item) => sum + item.cartAdds, 0),
  }), [items])

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-navy text-2xl font-black">إحصائيات بسيطة</h1>
          <p className="text-gray-500 text-sm mt-1">بيانات محلية من هذا المتصفح عن المشاهدات والإضافات للسلة.</p>
        </div>
        <Link href="/" className="btn-navy py-2 px-4 text-sm">المتجر</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-gray-500 text-sm">إجمالي المشاهدات</p>
          <p className="text-navy text-3xl font-black mt-1">{totals.views}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-500 text-sm">إضافات للسلة</p>
          <p className="text-navy text-3xl font-black mt-1">{totals.cartAdds}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gold/20">
          <p className="font-black text-navy">أعلى المنتجات تفاعلًا</p>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-bold text-navy mb-1">لا توجد بيانات بعد</p>
            <p className="text-gray-500 text-sm">افتح بعض المنتجات أو أضف منتجات للسلة لتظهر الإحصائيات هنا.</p>
          </div>
        ) : (
          <div className="divide-y divide-gold/10">
            {items.map(item => (
              <div key={item.id} className="p-4 grid gap-2 sm:grid-cols-[1fr_100px_100px] sm:items-center">
                <div>
                  <p className="font-black text-navy">{item.name}</p>
                  <p className="text-xs text-gray-500">آخر تفاعل: {new Date(item.lastSeenAt).toLocaleString('ar-EG')}</p>
                </div>
                <p className="text-sm text-gray-600">مشاهدات: <span className="font-black text-navy">{item.views}</span></p>
                <p className="text-sm text-gray-600">سلة: <span className="font-black text-navy">{item.cartAdds}</span></p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
