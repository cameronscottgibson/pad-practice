import { convertMinor, formatMoney } from '../src/lib/money'
import type { CurrencyCode } from '../src/lib/money'
import type { Corridor, DeliveryMethod, Quote, QuoteRequest, Transfer } from '../src/types'
import { QUOTE_TTL_MS } from './config'

export interface CorridorPricing {
  id: string
  country: string
  countryCode: string
  currency: CurrencyCode
  /** Destination major units per one USD. */
  rate: number
  /** Fee in USD cents per supported delivery method. */
  fees: Partial<Record<DeliveryMethod, number>>
}

// Rates and fees as published to customers. A method missing from `fees`
// is not offered in that corridor.
export const CORRIDOR_PRICING: CorridorPricing[] = [
  { id: 'us-mx', country: 'Mexico', countryCode: 'MX', currency: 'MXN', rate: 18.42, fees: { bank: 399, cash_pickup: 499 } },
  { id: 'us-ph', country: 'Philippines', countryCode: 'PH', currency: 'PHP', rate: 57.35, fees: { bank: 299, cash_pickup: 399, mobile_wallet: 199 } },
  { id: 'us-in', country: 'India', countryCode: 'IN', currency: 'INR', rate: 84.12, fees: { bank: 199, mobile_wallet: 199 } },
  { id: 'us-jp', country: 'Japan', countryCode: 'JP', currency: 'JPY', rate: 151.6, fees: { bank: 799 } },
  { id: 'us-es', country: 'Spain', countryCode: 'ES', currency: 'EUR', rate: 0.9234, fees: { bank: 499, cash_pickup: 599 } },
]

export const MIN_SEND = 100
export const MAX_SEND = 500_000

export class PricingError extends Error {}

export function findCorridor(corridorId: string): CorridorPricing | undefined {
  return CORRIDOR_PRICING.find((c) => c.id === corridorId)
}

/** The public view of a corridor, without our rate and fee table. */
export function toCorridor(pricing: CorridorPricing): Corridor {
  const { rate: _rate, fees, ...corridor } = pricing
  return { ...corridor, deliveryMethods: Object.keys(fees) as DeliveryMethod[] }
}

/**
 * The first-transfer promo waives the fee on a customer's first transfer to
 * each country. Transfers that never went through do not count.
 */
export function isPromoEligible(transfers: Transfer[], corridorId: string): boolean {
  return !transfers.some(
    (t) => t.corridorId === corridorId && t.status !== 'cancelled' && t.status !== 'failed',
  )
}

export interface QuoteContext {
  id: string
  now: number
  promoEligible: boolean
}

export function quoteFor(req: QuoteRequest, ctx: QuoteContext): Quote {
  const corridor = findCorridor(req.corridorId)
  if (!corridor) throw new PricingError(`Unknown corridor ${req.corridorId}`)

  const standardFee = corridor.fees[req.deliveryMethod]
  if (standardFee === undefined) {
    throw new PricingError(`Delivery method ${req.deliveryMethod} is not available to ${corridor.country}`)
  }

  if (!Number.isInteger(req.sendAmount) || req.sendAmount < MIN_SEND || req.sendAmount > MAX_SEND) {
    throw new PricingError(
      `Send amount must be between ${formatMoney(MIN_SEND, 'USD')} and ${formatMoney(MAX_SEND, 'USD')}`,
    )
  }

  const fee = ctx.promoEligible ? 0 : standardFee

  return {
    id: ctx.id,
    corridorId: corridor.id,
    deliveryMethod: req.deliveryMethod,
    sendAmount: req.sendAmount,
    sendCurrency: 'USD',
    receiveAmount: convertMinor(req.sendAmount, 'USD', corridor.currency, corridor.rate),
    receiveCurrency: corridor.currency,
    rate: corridor.rate,
    fee,
    promoApplied: ctx.promoEligible,
    totalCost: req.sendAmount + fee,
    createdAt: new Date(ctx.now).toISOString(),
    expiresAt: new Date(ctx.now + QUOTE_TTL_MS).toISOString(),
  }
}
