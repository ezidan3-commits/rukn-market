import type { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'

const PROJECT_ID = 'store-manager-8d619'

async function fetchProduct(id: string) {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${id}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const f = data.fields
    if (!f) return null
    return {
      name: f.name?.stringValue ?? '',
      sellEgp: Number(f.sellEgp?.doubleValue ?? f.sellEgp?.integerValue ?? 0),
      imageUrl: f.imageUrl?.stringValue ?? '',
      marketDescription: f.marketDescription?.stringValue ?? '',
      marketCategory: f.marketCategory?.stringValue ?? '',
    }
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const product = await fetchProduct(params.id)
  if (!product) return { title: 'ستور السعاده' }

  const price = `${product.sellEgp.toFixed(0)} ج.م`
  const title = `${product.name} — ستور السعاده`
  const description = product.marketDescription
    ? `${price} • ${product.marketDescription}`
    : `${product.name} بسعر ${price}`
  const images = product.imageUrl
    ? [{ url: product.imageUrl, alt: product.name, width: 800, height: 800 }]
    : []

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: 'website',
      locale: 'ar_EG',
      siteName: 'ستور السعاده',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  }
}

export default function ProductPage() {
  return <ProductDetailClient />
}
