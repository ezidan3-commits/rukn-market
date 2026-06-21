import Link from 'next/link'

export default function OrderSuccessPage() {
  return (
    <div className="max-w-sm mx-auto text-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="font-black text-navy text-2xl mb-2">تم استلام طلبك!</h1>
      <p className="text-gray-600 text-sm leading-relaxed mb-8">
        شكراً لك على طلبك من الركن الخليجي.<br />
        سيتواصل معك فريقنا قريباً لتأكيد الطلب وترتيب التوصيل.
      </p>

      <div className="card p-4 mb-6 text-sm text-gray-600 leading-relaxed">
        <p className="font-bold text-navy mb-1">ماذا يحدث الآن؟</p>
        <ul className="text-right space-y-1">
          <li>✅ تم تسجيل طلبك بنجاح</li>
          <li>📞 سيتصل بك فريقنا لتأكيد التفاصيل</li>
          <li>🚚 سيتم ترتيب التوصيل لباب منزلك</li>
        </ul>
      </div>

      <Link href="/" className="btn-primary block text-center">
        العودة للمتجر
      </Link>
    </div>
  )
}
