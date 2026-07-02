'use client'
import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'

interface ToastItem {
  id: number
  productName: string
  imageUrl?: string
}

interface ToastCtx {
  showToast: (productName: string, imageUrl?: string) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const showToast = useCallback((productName: string, imageUrl?: string) => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, productName, imageUrl }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 left-3 right-3 sm:left-auto sm:right-4 sm:w-72 z-[200] flex flex-col gap-2 pointer-events-none" dir="rtl">
        {toasts.map(toast => (
          <div key={toast.id} className="flex items-center gap-3 bg-navy/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl animate-toast-in">
            {toast.imageUrl && (
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={toast.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black line-clamp-1">{toast.productName}</p>
              <p className="text-[11px] text-white/60">تمت الإضافة للسلة</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
