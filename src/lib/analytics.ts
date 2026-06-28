'use client'
import { Product } from '@/lib/types'

const KEY = 'gulf-market-analytics'

export type AnalyticsEvent = 'view' | 'cart_add'

export interface ProductAnalytics {
  id: string
  name: string
  views: number
  cartAdds: number
  lastSeenAt: string
}

type AnalyticsStore = Record<string, ProductAnalytics>

function readStore(): AnalyticsStore {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as AnalyticsStore
  } catch {
    return {}
  }
}

function writeStore(store: AnalyticsStore) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function trackProductEvent(product: Product, event: AnalyticsEvent) {
  if (typeof window === 'undefined') return
  const store = readStore()
  const current = store[product.id] ?? {
    id: product.id,
    name: product.name,
    views: 0,
    cartAdds: 0,
    lastSeenAt: new Date().toISOString(),
  }

  store[product.id] = {
    ...current,
    name: product.name,
    views: current.views + (event === 'view' ? 1 : 0),
    cartAdds: current.cartAdds + (event === 'cart_add' ? 1 : 0),
    lastSeenAt: new Date().toISOString(),
  }

  writeStore(store)
}

export function getProductAnalytics() {
  return Object.values(readStore()).sort((a, b) => {
    const scoreA = a.views + a.cartAdds * 3
    const scoreB = b.views + b.cartAdds * 3
    return scoreB - scoreA
  })
}
