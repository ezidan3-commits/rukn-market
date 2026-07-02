'use client'
import { useCallback, useEffect, useState } from 'react'

const KEY = 'rv'
const MAX = 8

export interface RecentItem {
  id: string
  name: string
  sellEgp: number
  imageUrl?: string
  marketCategory?: string
}

export function useRecentlyViewed(excludeId?: string) {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const all = JSON.parse(raw) as RecentItem[]
        setItems(excludeId ? all.filter(i => i.id !== excludeId) : all)
      }
    } catch { /* ignore */ }
  }, [excludeId])

  const addItem = useCallback((item: RecentItem) => {
    try {
      const raw = localStorage.getItem(KEY)
      const current = raw ? (JSON.parse(raw) as RecentItem[]) : []
      const updated = [item, ...current.filter(i => i.id !== item.id)].slice(0, MAX)
      localStorage.setItem(KEY, JSON.stringify(updated))
    } catch { /* ignore */ }
  }, [])

  return { items, addItem }
}
