'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'

export default function Header() {
  const { count } = useCart()
  const { user, logout } = useAuth()

  return (
    <header className="bg-navy sticky top-0 z-50 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image src="/logo.png" alt="الركن الخليجي" width={44} height={44} className="rounded-full object-contain flex-shrink-0" />
          <span className="text-white font-black text-base sm:text-lg truncate">الركن الخليجي</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link href="/track" className="hidden sm:block text-white/80 hover:text-gold text-sm font-bold transition-colors">
            تتبع طلبك
          </Link>

          {user ? (
            <>
              <Link href="/my-orders" className="flex items-center gap-1.5 text-white/90 hover:text-gold text-sm font-bold transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="hidden sm:block">طلباتي</span>
                <span className="sm:hidden text-xs">طلباتي</span>
              </Link>
              <button
                onClick={() => logout()}
                className="text-white/50 hover:text-white/80 text-xs transition-colors hidden sm:block"
              >
                خروج
              </button>
            </>
          ) : (
            <Link href="/auth" className="flex items-center gap-1.5 text-white/90 hover:text-gold text-sm font-bold transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>حسابي</span>
            </Link>
          )}

          <Link href="/cart" className="relative flex items-center gap-1.5 text-white hover:text-gold transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-2 -left-2 bg-gold text-navy text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
            <span className="text-sm font-semibold hidden sm:block">السلة</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
