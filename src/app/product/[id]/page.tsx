import type { Metadata } from 'next'
import { getAdminDb } from '@/lib/firebase-admin'
import { Product, productImageSrc } from '@/lib/types'
import ProductDetailClient from './ProductDetailClient'

type ProductPageProps = {
  params: {
    id: string
  }
}

async function getProductForMetadata(id: string): Promise<Product | null> {
  try {
    const snap = await getAdminDb().collection('products').doc(id).get()
    if (!snap.exists) return null
    const product = { id: snap.id, ...snap.data() } as Product
    if (!product.visibleInMarket || product.quantity <= 0) return null
    return product
  } catch {
    return null
  }
}

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

export default function ProductPage({ params }: ProductPageProps) {
  return <ProductDetailClient id={params.id} />
}
