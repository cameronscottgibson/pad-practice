import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '../src/lib/money'
import type { DeliveryMethod, Transfer } from '../src/types'
import { CORRIDOR_PRICING, isPromoEligible, PricingError, quoteFor } from './pricing'

const context = { id: 'q_test', now: Date.parse('2026-01-15T12:00:00Z'), promoEligible: false }

describe('quoteFor', () => {
  it('uses the rate and fee from the pricing table for every corridor and method', () => {
    for (const corridor of CORRIDOR_PRICING) {
      for (const [method, fee] of Object.entries(corridor.fees)) {
        const quote = quoteFor(
          { corridorId: corridor.id, deliveryMethod: method as DeliveryMethod, sendAmount: 25000 },
          context,
        )
        expect(quote.rate).toBe(corridor.rate)
        expect(quote.fee).toBe(fee)
        expect(quote.receiveCurrency).toBe(corridor.currency)
        expect(quote.totalCost).toBe(25000 + fee)
      }
    }
  })

  it('computes the receive amount in the destination minor units', () => {
    for (const corridor of CORRIDOR_PRICING) {
      const method = Object.keys(corridor.fees)[0] as DeliveryMethod
      const quote = quoteFor({ corridorId: corridor.id, deliveryMethod: method, sendAmount: 12345 }, context)
      const destDecimals = CURRENCIES[corridor.currency].decimals
      const expected = Math.round((12345 / 100) * corridor.rate * 10 ** destDecimals)
      expect(quote.receiveAmount).toBe(expected)
    }
  })

  it('waives the fee only when the promo applies', () => {
    const request = { corridorId: 'us-mx', deliveryMethod: 'bank' as const, sendAmount: 10000 }
    const standard = quoteFor(request, context)
    const promo = quoteFor(request, { ...context, promoEligible: true })
    expect(standard.fee).toBeGreaterThan(0)
    expect(standard.promoApplied).toBe(false)
    expect(promo.fee).toBe(0)
    expect(promo.promoApplied).toBe(true)
    expect(promo.totalCost).toBe(10000)
  })

  it('sets an expiry after the quote time', () => {
    const quote = quoteFor({ corridorId: 'us-ph', deliveryMethod: 'bank', sendAmount: 10000 }, context)
    expect(Date.parse(quote.expiresAt)).toBeGreaterThan(context.now)
  })

  it('rejects unsupported corridors, methods and amounts', () => {
    const attempt = (corridorId: string, deliveryMethod: DeliveryMethod, sendAmount: number) => () =>
      quoteFor({ corridorId, deliveryMethod, sendAmount }, context)

    expect(attempt('us-xx', 'bank', 10000)).toThrow(PricingError)
    expect(attempt('us-jp', 'cash_pickup', 10000)).toThrow(PricingError)
    expect(attempt('us-mx', 'bank', 50)).toThrow(PricingError)
    expect(attempt('us-mx', 'bank', 10_000_000)).toThrow(PricingError)
  })
})

describe('isPromoEligible', () => {
  const transfer = (corridorId: string, status: Transfer['status']) => ({ corridorId, status }) as Transfer

  it('applies to the first transfer to a country', () => {
    expect(isPromoEligible([], 'us-mx')).toBe(true)
    expect(isPromoEligible([transfer('us-ph', 'delivered')], 'us-mx')).toBe(true)
  })

  it('does not apply once a transfer to that country went through', () => {
    expect(isPromoEligible([transfer('us-mx', 'delivered')], 'us-mx')).toBe(false)
    expect(isPromoEligible([transfer('us-mx', 'pending')], 'us-mx')).toBe(false)
  })

  it('ignores cancelled and failed transfers', () => {
    expect(isPromoEligible([transfer('us-mx', 'cancelled'), transfer('us-mx', 'failed')], 'us-mx')).toBe(true)
  })
})
