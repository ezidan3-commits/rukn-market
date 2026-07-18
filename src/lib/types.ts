export interface Product {
  id: string
  name: string
  sku: string
  sellEgp: number
  costEgp: number
  quantity: number
  imageUrl: string
  imageUrls?: string[]
  images?: string[]
  imageBase64?: string
  visibleInMarket: boolean
  marketCategory: string
  marketDescription: string
  categoryId?: string
  discountActive?: boolean
  discountPercent?: number
}

/** Final price after an active discount, rounded to the nearest pound. */
export function effectivePrice(product: Product): number {
  if (product.discountActive && product.discountPercent && product.discountPercent > 0) {
    const pct = Math.min(product.discountPercent, 100)
    return Math.round(product.sellEgp * (1 - pct / 100))
  }
  return product.sellEgp
}

export function hasActiveDiscount(product: Product): boolean {
  return !!(product.discountActive && product.discountPercent && product.discountPercent > 0)
}

export interface ProductCategory {
  id: string
  name: string
}

export function productImageSources(product: Product): string[] {
  const sources = [
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
    ...(Array.isArray(product.images) ? product.images : []),
    product.imageUrl,
    product.imageBase64 ? `data:image/jpeg;base64,${product.imageBase64}` : '',
  ]

  return Array.from(new Set(sources.filter(Boolean)))
}

export function productImageSrc(product: Product): string | null {
  return productImageSources(product)[0] ?? null
}

export interface CartItem {
  product: Product
  quantity: number
}

export type PaymentMethod = 'cash' | 'instapay' | 'vodafone_cash'

export interface OrderPaymentInfo {
  method: PaymentMethod
  label: string
  details?: string
}

export interface CheckoutForm {
  customerName: string
  customerPhone: string
  city: string
  address: string
  notes: string
  payment: PaymentMethod
}

export const PAYMENT_OPTIONS: OrderPaymentInfo[] = [
  { method: 'cash', label: 'كاش عند الاستلام', details: 'ادفع عند وصول الطلب' },
  { method: 'instapay', label: 'InstaPay', details: 'دفع إلكتروني عبر InstaPay' },
  { method: 'vodafone_cash', label: 'فودافون كاش', details: 'دفع عبر فودافون كاش' },
]

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'كاش عند الاستلام',
  instapay: 'InstaPay',
  vodafone_cash: 'فودافون كاش',
}
