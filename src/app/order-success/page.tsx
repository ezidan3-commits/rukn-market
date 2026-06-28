'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function OrderSuccessPage() {
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    setOrderId(sessionStorage.getItem('lastOrderId') ?? '')
  }, [])

  return (
    <div className="max-w-md mx-auto text-center py-12 px-4">
      <div className="w-20 h-20 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-11 h-11 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="font-black text-navy text-2xl mb-2">تم استلام طلبك</h1>
      <p className="text-gray-600 text-sm leading-7 mb-6">
        شكرًا لك على طلبك من الركن الخليجي. سيتواصل معك فريقنا قريبًا لتأكيد التفاصيل وترتيب التوصيل.
      </p>

      {orderId && (
        <div className="card p-4 mb-5">
          <p className="text-xs text-gray-500 mb-1">رقم الطلب</p>
          <p className="font-black text-navy break-all">{orderId}</p>
        </div>
      )}

      <div className="card p-4 mb-6 text-sm text-gray-600 leading-7 text-right">
        <p className="font-black text-navy mb-2">ماذا يحدث الآن؟</p>
        <ul className="space-y-1">
          <li>تم تسجيل طلبك بنجاح.</li>
          <li>سيتم التواصل معك لتأكيد التفاصيل.</li>
          <li>سيتم ترتيب التوصيل حسب العنوان المتفق عليه.</li>
        </ul>
      </div>

      <Link href="/" className="btn-primary block text-center">
        العودة للمتجر
      </Link>
    </div>
  )
}
