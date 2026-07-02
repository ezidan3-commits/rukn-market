'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const Confetti = dynamic(() => import('@/components/Confetti'), { ssr: false })

export default function OrderSuccessPage() {
  const [orderId, setOrderId] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    setOrderId(sessionStorage.getItem('lastOrderId') ?? '')
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <Confetti />

      <div className={`transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Success icon */}
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-green-400/25 animate-ping" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="font-black text-navy text-3xl mb-2 text-center">تم استلام طلبك! 🎉</h1>
        <p className="text-gray-500 text-sm leading-7 mb-6 text-center">
          شكرًا لثقتك في الركن الخليجي<br />سنتواصل معك قريبًا لتأكيد التفاصيل.
        </p>

        {orderId && (
          <div className="bg-navy rounded-2xl p-5 mb-5 text-center">
            <p className="text-white/50 text-xs mb-1">رقم الطلب</p>
            <p className="font-black text-gold text-lg tracking-wider break-all">{orderId}</p>
          </div>
        )}

        <div className="card p-5 mb-5">
          <p className="font-black text-navy text-sm mb-4">ماذا يحدث الآن؟</p>
          <div className="space-y-4">
            {[
              { icon: '✅', title: 'تم تسجيل الطلب', desc: 'وصل طلبك بنجاح وتم تسجيله' },
              { icon: '📞', title: 'سنتواصل معك', desc: 'سيتصل بك فريقنا لتأكيد التفاصيل' },
              { icon: '🚚', title: 'التوصيل', desc: 'سيتم التوصيل حسب عنوانك المتفق عليه' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{step.icon}</span>
                <div>
                  <p className="font-black text-navy text-sm">{step.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link href="/" className="btn-primary block text-center mb-3">
          تسوق مجدداً 🛍️
        </Link>
        <Link href="/my-orders" className="btn-navy block text-center">
          متابعة طلبي
        </Link>
      </div>
    </div>
  )
}
