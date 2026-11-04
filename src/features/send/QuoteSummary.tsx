import { formatDateTime } from '../../lib/dates'
import { formatMoney, formatRate } from '../../lib/money'
import type { Quote } from '../../types'

interface QuoteSummaryProps {
  quote: Quote | null
  loading: boolean
  error: string | null
  expired: boolean
  country: string | undefined
  onRefresh: () => void
}

export default function QuoteSummary({ quote, loading, error, expired, country, onRefresh }: QuoteSummaryProps) {
  if (error || !quote) {
    return (
      <aside className="card quote">
        <h2 className="card__title">Your quote</h2>
        {error ? (
          <p className="field__error">{error}</p>
        ) : (
          <p className="muted">{loading ? 'Getting the latest rate…' : 'Enter an amount to see the rate and fees.'}</p>
        )}
      </aside>
    )
  }

  return (
    <aside className={`card quote${loading ? ' updating' : ''}`} aria-busy={loading}>
      <h2 className="card__title">Your quote</h2>

      <dl className="summary">
        <div>
          <dt>You send</dt>
          <dd>{formatMoney(quote.sendAmount, quote.sendCurrency)}</dd>
        </div>
        <div>
          <dt>Transfer fee</dt>
          <dd>{quote.promoApplied ? 'Free' : formatMoney(quote.fee, quote.sendCurrency)}</dd>
        </div>
        <div className="summary__total">
          <dt>Total to pay</dt>
          <dd>{formatMoney(quote.totalCost, quote.sendCurrency)}</dd>
        </div>
        <div>
          <dt>Exchange rate</dt>
          <dd>{formatRate(quote.rate, quote.sendCurrency, quote.receiveCurrency)}</dd>
        </div>
      </dl>

      <div className="quote__receive">
        <span className="muted">Recipient gets</span>
        <strong>{formatMoney(quote.receiveAmount, quote.receiveCurrency)}</strong>
      </div>

      {quote.promoApplied && (
        <p className="promo">Your first transfer to {country ?? 'this country'} has no fee.</p>
      )}

      {expired ? (
        <div className="alert alert--warning">
          <p>This rate has expired.</p>
          <button type="button" className="button button--secondary" onClick={onRefresh}>
            Get a new rate
          </button>
        </div>
      ) : (
        <p className="muted small">Rate held until {formatDateTime(quote.expiresAt)}.</p>
      )}
    </aside>
  )
}
