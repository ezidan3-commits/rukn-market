import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'الركن الخليجي',
  description: 'متجر الركن الخليجي — منتجات خليجية أصيلة',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-cream font-arabic">
        <CartProvider>
          <Header />
          <main className="max-w-5xl mx-auto px-4 pb-20 pt-4">
            {children}
          </main>
        </CartProvider>
      </body>
    </html>
  )
}
