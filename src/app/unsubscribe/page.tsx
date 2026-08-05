'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function UnsubscribePage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { setError('سجل الدخول بالحساب الذي تصله العروض أولاً'); return }

    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'حدث خطأ')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <h1 className="font-black text-navy text-xl mb-2">تم إلغاء الاشتراك</h1>
          <p className="text-gray-500 text-sm leading-7 mb-6">
            لن تصلك بعد الآن رسائل العروض والخصومات. لو غيّرت رأيك، أي طلب جديد هيرجّعك للقائمة تلقائيًا.
          </p>
          <Link href="/" className="btn-primary inline-block px-6">العودة للمتجر</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="text-center mb-6">
        <h1 className="font-black text-navy text-2xl">إلغاء الاشتراك فى العروض</h1>
        <p className="text-gray-500 text-sm mt-2 leading-7">
          سجل الدخول بالحساب الذي تصله العروض ثم أكد إلغاء الاشتراك.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <p className="text-sm text-gray-600 text-center" dir="ltr">
          {user?.email ?? 'لم يتم تسجيل الدخول'}
        </p>
        {!authLoading && !user && (
          <Link href="/auth?next=/unsubscribe" className="btn-secondary block text-center">
            تسجيل الدخول
          </Link>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading || authLoading || !user} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading
            ? (<><div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />جارِ الإلغاء...</>)
            : 'إلغاء الاشتراك'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/" className="text-navy font-bold hover:text-gold">العودة للمتجر</Link>
      </p>
    </div>
  )
}
