import { useEffect, useState } from 'react'
import { apiGet, errorMessage, isAbortError } from '../../api/client'
import { formatDateTime } from '../../lib/dates'
import { formatMoney, formatRate } from '../../lib/money'
import { useAppData } from '../../state/AppData'
import { DELIVERY_METHOD_LABELS, STATUS_LABELS } from '../../types'
import type { Transfer } from '../../types'
import { describePayout } from '../recipients/format'
import StatusBadge from './StatusBadge'

interface TransferDetailProps {
  transferId: string
  justSent: boolean
  onBack: () => void
}

export default function TransferDetail({ transferId, justSent, onBack }: TransferDetailProps) {
  const { corridorById, recipients } = useAppData()
  const [transfer, setTransfer] = useState<Transfer | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setTransfer(null)
    setError(null)

    apiGet<Transfer>(`/transfers/${encodeURIComponent(transferId)}`, { signal: controller.signal })
      .then(setTransfer)
      .catch((err: unknown) => {
        if (!isAbortError(err)) setError(errorMessage(err))
      })

    return () => controller.abort()
  }, [transferId])

  const backButton = (
    <button type="button" className="link-button" onClick={onBack}>
      ← All activity
    </button>
  )

  if (!transfer) {
    return (
      <div className="page">
        {backButton}
        {error ? <div className="alert alert--error">{error}</div> : <p className="muted">Loading transfer…</p>}
      </div>
    )
  }

  const recipient = recipients.find((r) => r.id === transfer.recipientId)
  const country = corridorById(transfer.corridorId)?.country

  return (
    <div className="page">
      {backButton}

      {justSent && (
        <div className="alert alert--success">
          Your money is on its way to {transfer.recipientName}. We will email you when it arrives.
        </div>
      )}

      <div className="card detail">
        <div className="detail__header">
          <div>
            <p className="muted small">Transfer {transfer.reference}</p>
            <h1 className="detail__amount">{formatMoney(transfer.receiveAmount, transfer.receiveCurrency)}</h1>
            <p>
              to {transfer.recipientName}
              {country ? ` in ${country}` : ''}
            </p>
          </div>
          <StatusBadge status={transfer.status} />
        </div>

        <dl className="summary">
          <div>
            <dt>You sent</dt>
            <dd>{formatMoney(transfer.sendAmount, transfer.sendCurrency)}</dd>
          </div>
          <div>
            <dt>Transfer fee</dt>
            <dd>{transfer.promoApplied ? 'Free (first transfer offer)' : formatMoney(transfer.fee, transfer.sendCurrency)}</dd>
          </div>
          <div className="summary__total">
            <dt>Total paid</dt>
            <dd>{formatMoney(transfer.totalCost, transfer.sendCurrency)}</dd>
          </div>
          <div>
            <dt>Exchange rate</dt>
            <dd>{formatRate(transfer.rate, transfer.sendCurrency, transfer.receiveCurrency)}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>
              {DELIVERY_METHOD_LABELS[transfer.deliveryMethod]}
              {recipient && transfer.deliveryMethod !== 'cash_pickup' ? `, ${describePayout(recipient)}` : ''}
            </dd>
          </div>
        </dl>

        <h2 className="card__title">Timeline</h2>
        <ol className="timeline">
          {transfer.events.map((event) => (
            <li key={`${event.status}-${event.at}`}>
              <strong>{STATUS_LABELS[event.status]}</strong>
              <span className="muted small">{formatDateTime(event.at)}</span>
              {event.note && <span className="small">{event.note}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
