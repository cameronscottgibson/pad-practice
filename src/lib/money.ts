// All amounts in Sendwell are integers in the currency's minor unit (cents for
// USD, whole yen for JPY). Convert to a display string only at the edge.

export type CurrencyCode = 'USD' | 'MXN' | 'PHP' | 'INR' | 'JPY' | 'EUR'

export interface CurrencyInfo {
  decimals: number
  symbol: string
  name: string
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { decimals: 2, symbol: '$', name: 'US dollar' },
  MXN: { decimals: 2, symbol: '$', name: 'Mexican peso' },
  PHP: { decimals: 2, symbol: '₱', name: 'Philippine peso' },
  INR: { decimals: 2, symbol: '₹', name: 'Indian rupee' },
  JPY: { decimals: 0, symbol: '¥', name: 'Japanese yen' },
  EUR: { decimals: 2, symbol: '€', name: 'Euro' },
}

const WHOLE_PART = String.raw`(\d+|\d{1,3}(,\d{3})+)`

/**
 * Parses user input such as "1,250.75" into minor units.
 * Returns null for anything that is not a non-negative amount with at most
 * the currency's number of decimal places.
 */
export function parseAmount(input: string, currency: CurrencyCode): number | null {
  const { decimals } = CURRENCIES[currency]
  const fraction = decimals > 0 ? String.raw`(\.\d{1,${decimals}})?` : ''
  const value = input.trim()

  if (!new RegExp(`^${WHOLE_PART}${fraction}$`).test(value)) return null

  const [whole, frac = ''] = value.replace(/,/g, '').split('.')
  const minor = Number(whole) * 10 ** decimals + Number(frac.padEnd(decimals, '0') || '0')
  return Number.isSafeInteger(minor) ? minor : null
}

export function toMajor(minor: number, currency: CurrencyCode): number {
  return minor / 10 ** CURRENCIES[currency].decimals
}

const moneyFormats = new Map<CurrencyCode, Intl.NumberFormat>()

export function formatMoney(minor: number, currency: CurrencyCode): string {
  let format = moneyFormats.get(currency)
  if (!format) {
    const { decimals } = CURRENCIES[currency]
    format = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    moneyFormats.set(currency, format)
  }
  return format.format(toMajor(minor, currency))
}

/**
 * Converts an amount using a rate quoted as destination major units per one
 * source major unit, rounding to the nearest destination minor unit.
 */
export function convertMinor(amount: number, from: CurrencyCode, to: CurrencyCode, rate: number): number {
  const destScale = 10 ** CURRENCIES[to].decimals
  return Math.round(toMajor(amount, from) * rate * destScale)
}

export function formatRate(rate: number, from: CurrencyCode, to: CurrencyCode): string {
  const digits = rate < 10 ? 4 : 2
  return `1 ${from} = ${rate.toFixed(digits)} ${to}`
}
