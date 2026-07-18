'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CartItem, Product, effectivePrice } from '@/lib/types'

interface CartContextType {
  items: CartItem[]
  add: (product: Product, qty?: number) => void
  remove: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clear: () => void
  syncWithProducts: (freshProducts: Product[]) => void
  total: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('cart')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const add = (product: Product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, product.quantity)
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: newQty } : i
        )
      }
      return [...prev, { product, quantity: Math.min(qty, product.quantity) }]
    })
  }

  const remove = (productId: string) =>
    setItems(prev => prev.filter(i => i.product.id !== productId))

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) return remove(productId)
    setItems(prev =>
      prev.map(i => {
        if (i.product.id !== productId) return i
        return { ...i, quantity: Math.min(qty, i.product.quantity) }
      })
    )
  }

  const clear = () => setItems([])

  const syncWithProducts = (freshProducts: Product[]) => {
    setItems(prev => {
      const updated = prev
        .map(item => {
          const fresh = freshProducts.find(p => p.id === item.product.id)
          if (!fresh || !fresh.visibleInMarket || fresh.quantity <= 0) return null
          return { product: fresh, quantity: Math.min(item.quantity, fresh.quantity) }
        })
        .filter((i): i is CartItem => i !== null)
      const hasChange = updated.length !== prev.length ||
        updated.some((u, i) => u.quantity !== prev[i]?.quantity || effectivePrice(u.product) !== effectivePrice(prev[i]?.product))
      return hasChange ? updated : prev
    })
  }

  const total = items.reduce((sum, i) => sum + effectivePrice(i.product) * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, remove, updateQty, clear, syncWithProducts, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
