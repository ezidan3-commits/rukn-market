export interface Product {
  id: string
  name: string
  sku: string
  sellEgp: number
  costEgp: number
  quantity: number
  imageUrl: string
  imageBase64?: string
  visibleInMarket: boolean
  marketCategory: string
  marketDescription: string
}

export function productImageSrc(product: Product): string | null {
  if (product.imageUrl) return product.imageUrl
  if (product.imageBase64) return `data:image/jpeg;base64,${product.imageBase64}`
  return null
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
