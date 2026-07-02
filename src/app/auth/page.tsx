'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthPage() {
  const { user, login, register } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/'

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) router.replace(next)
  }, [user, next, router])

  const errMsg = (code: string) => {
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential'))
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
    if (code.includes('email-already-in-use')) return 'هذا البريد مسجّل بالفعل، سجّل دخولك'
    if (code.includes('weak-password')) return 'كلمة المرور ضعيفة (6 أحرف على الأقل)'
    if (code.includes('invalid-email')) return 'بريد إلكتروني غير صالح'
    if (code.includes('too-many-requests')) return 'تم حظر المحاولات مؤقتاً، حاول بعد قليل'
    return 'حدث خطأ، حاول مرة أخرى'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (tab === 'register' && !name.trim()) { setError('الاسم مطلوب'); return }
    if (!email.trim()) { setError('البريد الإلكتروني مطلوب'); return }
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return }

    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password, name.trim())
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(errMsg(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="font-black text-navy text-2xl">حسابي</h1>
        <p className="text-gray-500 text-sm mt-1">سجّل دخولك لمتابعة طلباتك وإدارتها</p>
      </div>

      <div className="card p-6">
        <div className="flex rounded-lg overflow-hidden border border-gold/30 mb-5">
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-black transition-colors ${
                tab === t ? 'bg-navy text-white' : 'text-navy hover:bg-navy/5'
              }`}
            >
              {t === 'login' ? 'تسجيل دخول' : 'حساب جديد'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <div>
              <label className="text-sm font-semibold text-navy block mb-1">الاسم الكامل *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: أحمد محمد"
                className="w-full border border-gold/40 rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-navy block mb-1">البريد الإلكتروني *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              className="w-full border border-gold/40 rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-navy block mb-1">كلمة المرور *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              dir="ltr"
              className="w-full border border-gold/40 rounded-lg px-4 py-3 text-navy text-sm focus:outline-none focus:border-gold"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" /> جاري التحقق...</>
            ) : tab === 'login' ? 'دخول' : 'إنشاء حساب'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/" className="text-navy font-bold hover:text-gold">العودة للمتجر</Link>
      </p>
    </div>
  )
}
