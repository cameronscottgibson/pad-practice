import { useEffect, useState } from 'react'
import { apiGet, errorMessage, isAbortError } from '../../api/client'
import { formatDate } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { useAppData } from '../../state/AppData'
import { STATUS_LABELS } from '../../types'
import type { Transfer, TransferStatus } from '../../types'
import StatusBadge from './StatusBadge'

type StatusFilter = TransferStatus | 'all'

interface HistoryPageProps {
  onOpen: (transferId: string) => void
}

export default function HistoryPage({ onOpen }: HistoryPageProps) {
  const { corridorById } = useAppData()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const query = filter === 'all' ? '' : `?status=${filter}`
    setLoading(true)
    setError(null)

    apiGet<Transfer[]>(`/transfers${query}`, { signal: controller.signal })
      .then((list) => {
        setTransfers(list)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return
        setError(errorMessage(err))
        setLoading(false)
      })

    return () => controller.abort()
  }, [filter])

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Activity</h1>
        <label className="inline-field">
          <span>Status</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)}>
            <option value="all">All transfers</option>
            {(Object.keys(STATUS_LABELS) as TransferStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="alert alert--error">{error}</div>
      ) : loading && transfers.length === 0 ? (
        <p className="muted">Loading transfers…</p>
      ) : transfers.length === 0 ? (
        <p className="muted">No transfers match this filter.</p>
      ) : (
        <ul className={`card list${loading ? ' updating' : ''}`}>
          {transfers.map((transfer) => (
            <li key={transfer.id}>
              <button type="button" className="list__row" onClick={() => onOpen(transfer.id)}>
                <div className="list__main">
                  <strong>{transfer.recipientName}</strong>
                  <span className="muted small">
                    {formatDate(transfer.createdAt)} · {corridorById(transfer.corridorId)?.country} ·{' '}
                    {transfer.reference}
                  </span>
                </div>
                <div className="list__meta">
                  <span>{formatMoney(transfer.sendAmount, transfer.sendCurrency)}</span>
                  <span className="muted small">{formatMoney(transfer.receiveAmount, transfer.receiveCurrency)}</span>
                </div>
                <StatusBadge status={transfer.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
