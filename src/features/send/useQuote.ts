import { useCallback, useEffect, useState } from 'react'
import { apiPost, errorMessage, isAbortError } from '../../api/client'
import type { DeliveryMethod, Quote } from '../../types'

// Wait for the customer to stop typing before asking for a new quote.
const DEBOUNCE_MS = 300

export interface QuoteInput {
  corridorId: string
  deliveryMethod: DeliveryMethod | null
  /** USD cents, or null when the amount field is empty or invalid. */
  sendAmount: number | null
}

export interface QuoteState {
  quote: Quote | null
  loading: boolean
  error: string | null
  expired: boolean
  refresh: () => void
}

export function useQuote({ corridorId, deliveryMethod, sendAmount }: QuoteInput): QuoteState {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    if (!corridorId || !deliveryMethod || !sendAmount) {
      setQuote(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      apiPost<Quote>('/quotes', { corridorId, deliveryMethod, sendAmount }, { signal: controller.signal })
        .then((next) => {
          setQuote(next)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (isAbortError(err)) return
          setQuote(null)
          setError(errorMessage(err))
          setLoading(false)
        })
    }, DEBOUNCE_MS)

    // A newer input replaces this request, so drop its result.
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [deliveryMethod, sendAmount, refreshCount])

  useEffect(() => {
    setExpired(false)
    if (!quote) return

    const msLeft = Date.parse(quote.expiresAt) - Date.now()
    const timer = setTimeout(() => setExpired(true), Math.max(0, msLeft))
    return () => clearTimeout(timer)
  }, [quote])

  const refresh = useCallback(() => setRefreshCount((n) => n + 1), [])

  return { quote, loading, error, expired, refresh }
}
