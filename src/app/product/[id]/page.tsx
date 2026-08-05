import type { Metadata } from 'next'
import { cache } from 'react'
import { getAdminDb } from '@/lib/firebase-admin'
import { Product, productImageSrc, productImageSources, effectivePrice } from '@/lib/types'
import ProductDetailClient from './ProductDetailClient'

type ProductPageProps = {
  params: {
    id: string
  }
}

// Wrapped in React's cache() so generateMetadata() and the page component
// below share one Firestore read per request instead of two.
const getProductForMetadata = cache(async (id: string): Promise<Product | null> => {
  try {
    const snap = await getAdminDb().collection('products').doc(id).get()
    if (!snap.exists) return null
    const product = { id: snap.id, ...snap.data() } as Product
    if (!product.visibleInMarket) return null
    return product
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductForMetadata(params.id)
  if (!product) {
    return {
      title: 'منتج غير متاح',
      description: 'هذا المنتج غير متاح حاليًا في الركن الخليجي.',
    }
  }

  const image = productImageSrc(product) ?? '/logo.png'
  const description = product.marketDescription || `${product.name} متاح الآن في الركن الخليجي.`

  return {
    title: product.name,
    description,
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: [image],
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductForMetadata(params.id)

  return (
    <>
      {product && <ProductJsonLd product={product} />}
      <ProductDetailClient id={params.id} />
    </>
  )
}

function ProductJsonLd({ product }: { product: Product }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rukn-market.vercel.app'
  // data: URIs aren't valid values for schema.org's `image` — only include
  // real hosted URLs (the normal case; base64 is an offline-save fallback).
  const images = productImageSources(product).filter(src => src.startsWith('http'))

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.marketDescription || `${product.name} متاح الآن في الركن الخليجي.`,
    ...(images.length ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/product/${product.id}`,
      priceCurrency: 'EGP',
      price: effectivePrice(product),
      availability: product.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <script
      type="application/ld+json"
      // Guard against `</script>`-style injection via product name/description.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  )
}
