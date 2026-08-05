import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rukn-market.vercel.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Functional/private pages have nothing worth indexing and would
        // otherwise show up in search results as dead ends for a crawler
        // (empty cart, auth-gated content, API routes).
        disallow: ['/cart', '/checkout', '/my-orders', '/auth', '/order-success', '/unsubscribe', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
