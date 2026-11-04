import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiPost, errorMessage } from '../../api/client'
import { parseAmount } from '../../lib/money'
import { useAppData } from '../../state/AppData'
import { DELIVERY_METHOD_LABELS } from '../../types'
import type { DeliveryMethod, Transfer } from '../../types'
import { describePayout } from '../recipients/format'
import QuoteSummary from './QuoteSummary'
import { useQuote } from './useQuote'

interface SendPageProps {
  onSent: (transfer: Transfer) => void
  onAddRecipient: () => void
}

export default function SendPage({ onSent, onAddRecipient }: SendPageProps) {
  const { corridors, recipients, corridorById } = useAppData()

  const [amountInput, setAmountInput] = useState('')
  const [selectedCorridorId, setSelectedCorridorId] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fall back to the first valid option whenever a choice stops applying,
  // for example a delivery method the new country does not offer.
  const corridor = corridorById(selectedCorridorId) ?? corridors[0]
  const methods = corridor?.deliveryMethods ?? []
  const deliveryMethod = selectedMethod && methods.includes(selectedMethod) ? selectedMethod : (methods[0] ?? null)
  const eligibleRecipients = recipients.filter(
    (r) => r.corridorId === corridor?.id && r.deliveryMethod === deliveryMethod,
  )
  const recipient = eligibleRecipients.find((r) => r.id === selectedRecipientId) ?? eligibleRecipients[0]

  const sendAmount = parseAmount(amountInput, 'USD')
  const amountInvalid = amountInput.trim() !== '' && sendAmount === null

  const { quote, loading, error, expired, refresh } = useQuote({
    corridorId: corridor?.id ?? '',
    deliveryMethod,
    sendAmount,
  })

  const canSubmit = quote !== null && !loading && !expired && recipient !== undefined && !submitting

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!quote || !recipient) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const transfer = await apiPost<Transfer>('/transfers', { quoteId: quote.id, recipientId: recipient.id })
      onSent(transfer)
    } catch (err) {
      setSubmitError(errorMessage(err))
      // The quote can no longer be used, so fetch a fresh one.
      if (err instanceof ApiError && [404, 409, 410].includes(err.status)) refresh()
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page__title">Send money</h1>

      <div className="send-layout">
        <form className="card form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="amount">You send (USD)</label>
            <input
              id="amount"
              className="amount-input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              aria-invalid={amountInvalid}
              aria-describedby={amountInvalid ? 'amount-error' : undefined}
            />
            {amountInvalid && (
              <p id="amount-error" className="field__error">
                Enter an amount like 250 or 250.00.
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="corridor">Sending to</label>
            <select id="corridor" value={corridor?.id ?? ''} onChange={(e) => setSelectedCorridorId(e.target.value)}>
              {corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.country} ({c.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="deliveryMethod">Delivery method</label>
            <select
              id="deliveryMethod"
              value={deliveryMethod ?? ''}
              onChange={(e) => setSelectedMethod(e.target.value as DeliveryMethod)}
            >
              {methods.map((method) => (
                <option key={method} value={method}>
                  {DELIVERY_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="recipient">Recipient</label>
            {eligibleRecipients.length > 0 ? (
              <select id="recipient" value={recipient?.id ?? ''} onChange={(e) => setSelectedRecipientId(e.target.value)}>
                {eligibleRecipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}, {describePayout(r)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="muted">No saved recipients in {corridor?.country} for this delivery method.</p>
            )}
            <button type="button" className="link-button" onClick={onAddRecipient}>
              Add a new recipient
            </button>
          </div>

          {submitError && <div className="alert alert--error">{submitError}</div>}

          <button type="submit" className="button button--primary" disabled={!canSubmit}>
            {submitting ? 'Sending…' : 'Send money'}
          </button>
        </form>

        <QuoteSummary
          quote={quote}
          loading={loading}
          error={error}
          expired={expired}
          country={corridor?.country}
          onRefresh={refresh}
        />
      </div>
    </div>
  )
}
