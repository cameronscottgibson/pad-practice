import type { CurrencyCode } from './lib/money'

export type { CurrencyCode }

export type DeliveryMethod = 'bank' | 'cash_pickup' | 'mobile_wallet'

export type TransferStatus = 'pending' | 'processing' | 'delivered' | 'cancelled' | 'failed'

export interface Corridor {
  id: string
  country: string
  countryCode: string
  currency: CurrencyCode
  deliveryMethods: DeliveryMethod[]
}

export interface QuoteRequest {
  corridorId: string
  deliveryMethod: DeliveryMethod
  /** Amount to send, in USD cents. */
  sendAmount: number
}

/** The priced terms of a transfer, fixed when the quote is issued. */
export interface QuoteTerms {
  corridorId: string
  deliveryMethod: DeliveryMethod
  sendAmount: number
  sendCurrency: CurrencyCode
  receiveAmount: number
  receiveCurrency: CurrencyCode
  /** Destination major units per one USD. */
  rate: number
  fee: number
  promoApplied: boolean
  /** sendAmount plus fee, in USD cents. */
  totalCost: number
}

export interface Quote extends QuoteTerms {
  id: string
  createdAt: string
  expiresAt: string
}

export interface Recipient {
  id: string
  name: string
  corridorId: string
  deliveryMethod: DeliveryMethod
  bankName?: string
  accountNumber?: string
  phone?: string
  createdAt: string
}

export interface TransferEvent {
  status: TransferStatus
  at: string
  note?: string
}

export interface Transfer extends QuoteTerms {
  id: string
  reference: string
  quoteId: string
  recipientId: string
  recipientName: string
  status: TransferStatus
  createdAt: string
  updatedAt: string
  events: TransferEvent[]
}

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  bank: 'Bank deposit',
  cash_pickup: 'Cash pickup',
  mobile_wallet: 'Mobile wallet',
}

export const STATUS_LABELS: Record<TransferStatus, string> = {
  pending: 'Pending',
  processing: 'In progress',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
}
