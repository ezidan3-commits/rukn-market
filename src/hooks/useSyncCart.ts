'use client'
import { useEffect, useRef, useState } from 'react'
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'
import { useCart } from '@/context/CartContext'
import { Product, effectivePrice } from '@/lib/types'

const CHUNK = 30 // Firestore `in` query limit

/**
 * Re-fetches live product data for whatever is currently in the cart and
 * reconciles it (removes sold-out/hidden items, clamps quantities, updates
 * prices). The homepage already does this on load/focus, but a customer can
 * land straight on /cart or /checkout (bookmark, PWA shortcut) without ever
 * visiting the homepage first — without this, they could review and submit
 * an order at stale prices that don't match what the server actually
 * charges. Returns which product IDs had their price change, if any, so the
 * caller can surface a "price changed" notice instead of silently updating.
 */
export function useSyncCart() {
  const { items, syncWithProducts } = useCart()
  const [changedIds, setChangedIds] = useState<string[]>([])
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    if (items.length === 0) return
    didRun.current = true

    const run = async () => {
      try {
        await ensureAuth()
        const ids = items.map(i => i.product.id)
        const priceBefore = new Map(items.map(i => [i.product.id, effectivePrice(i.product)]))
        const fetched: Product[] = []
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK)
          const snap = await getDocs(query(collection(db, 'products'), where(documentId(), 'in', chunk)))
          snap.docs.forEach(d => fetched.push({ id: d.id, ...d.data() } as Product))
        }
        const changed = fetched
          .filter(p => priceBefore.has(p.id) && priceBefore.get(p.id) !== effectivePrice(p))
          .map(p => p.id)
        if (changed.length) setChangedIds(changed)
        syncWithProducts(fetched)
      } catch (err) {
        console.error('[useSyncCart]', err)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  return { changedIds }
}
