export const DRAFT_KEY = 'editOrderDraft'

export interface DraftItem {
  productId: string
  name: string
  sellEgp: number
  quantity: number
}

export interface EditOrderDraft {
  orderId: string
  orderNumber: string
  draftItems: DraftItem[]
}
