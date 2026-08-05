import type { MetadataRoute } from 'next'
import { getAdminDb } from '@/lib/firebase-admin'

// Cache the generated sitemap for an hour instead of hitting Firestore on
// every crawler request — search engines poll sitemaps infrequently anyway,
// and this keeps read cost predictable regardless of crawl frequency.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rukn-market.vercel.app'

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/track`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  try {
    const snap = await getAdminDb().collection('products').where('visibleInMarket', '==', true).get()
    for (const doc of snap.docs) {
      const data = doc.data()
      if (Number(data.quantity ?? 0) <= 0) continue // out of stock — not worth indexing
      const updatedAt = data.updatedAt?.toDate?.() ?? new Date()
      entries.push({
        url: `${siteUrl}/product/${doc.id}`,
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (err) {
    // A broken sitemap fetch must not take down the whole route — fall
    // back to just the static entries above.
    console.error('[sitemap] failed to load products:', err)
  }

  return entries
}
