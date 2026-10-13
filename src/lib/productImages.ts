'use client'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase'
import { Product, productImageSources } from '@/lib/types'

// Product photos live in /productImages/{productId} ({base64, version}) so the
// catalog query doesn't download every image. Older products may still carry
// an inline image (imageUrl / imageBase64); that always wins.

const cache = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

export function loadProductImage(productId: string): Promise<string | null> {
  if (cache.has(productId)) return Promise.resolve(cache.get(productId) ?? null)
  const pending = inflight.get(productId)
  if (pending) return pending
  const request = (async () => {
    try {
      await ensureAuth()
      const snap = await getDoc(doc(db, 'productImages', productId))
      const b64 = snap.exists() ? (snap.data().base64 as string | undefined) : undefined
      const src = b64 ? `data:image/jpeg;base64,${b64}` : null
      cache.set(productId, src)
      return src
    } catch {
      return null
    } finally {
      inflight.delete(productId)
    }
  })()
  inflight.set(productId, request)
  return request
}

/** All image sources for a product, fetching the stored photo if needed. */
export function useProductImageSources(product: Product | null | undefined): string[] {
  const inline = product ? productImageSources(product) : []
  const needsFetch = !!product && inline.length === 0
  const productId = product?.id
  const [fetched, setFetched] = useState<string | null>(
    needsFetch && productId ? cache.get(productId) ?? null : null,
  )

  useEffect(() => {
    if (!needsFetch || !productId) return
    let cancelled = false
    loadProductImage(productId).then(src => {
      if (!cancelled) setFetched(src)
    })
    return () => {
      cancelled = true
    }
  }, [needsFetch, productId])

  if (inline.length > 0) return inline
  return fetched ? [fetched] : []
}

/** The main image for a product, fetching the stored photo if needed. */
export function useProductImage(product: Product | null | undefined): string | null {
  return useProductImageSources(product)[0] ?? null
}
