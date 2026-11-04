import { describe, expect, it } from 'vitest'
import { convertMinor, formatMoney, parseAmount } from './money'

describe('parseAmount', () => {
  it('parses dollars and cents into minor units', () => {
    expect(parseAmount('10.50', 'USD')).toBe(1050)
    expect(parseAmount('10.5', 'USD')).toBe(1050)
    expect(parseAmount('10', 'USD')).toBe(1000)
    expect(parseAmount(' 1,250.75 ', 'USD')).toBe(125075)
  })

  it('treats zero-decimal currencies as whole units', () => {
    expect(parseAmount('1000', 'JPY')).toBe(1000)
    expect(parseAmount('10.5', 'JPY')).toBeNull()
    expect(parseAmount('10.', 'JPY')).toBeNull()
  })

  it('rejects input that is not a positive amount', () => {
    expect(parseAmount('abc', 'USD')).toBeNull()
    expect(parseAmount('-5', 'USD')).toBeNull()
    expect(parseAmount('', 'USD')).toBeNull()
    expect(parseAmount('1.234', 'USD')).toBeNull()
    expect(parseAmount('1,23', 'USD')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats minor units with grouping and decimals', () => {
    expect(formatMoney(123456, 'USD')).toContain('1,234.56')
    expect(formatMoney(5, 'EUR')).toContain('0.05')
  })

  it('never shows decimals for JPY', () => {
    const formatted = formatMoney(1000, 'JPY')
    expect(formatted).toContain('1,000')
    expect(formatted).not.toContain('.')
  })
})

describe('convertMinor', () => {
  it('converts between currencies with different decimal places', () => {
    expect(convertMinor(10000, 'USD', 'MXN', 18.42)).toBe(184200)
    expect(convertMinor(10000, 'USD', 'JPY', 151.6)).toBe(15160)
    expect(convertMinor(333, 'USD', 'JPY', 151.6)).toBe(505)
  })
})
