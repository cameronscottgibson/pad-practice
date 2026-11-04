import { useState } from 'react'
import { useAppData } from '../../state/AppData'
import { DELIVERY_METHOD_LABELS } from '../../types'
import AddRecipientForm from './AddRecipientForm'
import { describePayout } from './format'

interface RecipientsPageProps {
  startAdding: boolean
}

export default function RecipientsPage({ startAdding }: RecipientsPageProps) {
  const { recipients, corridorById } = useAppData()
  const [adding, setAdding] = useState(startAdding)
  const [savedName, setSavedName] = useState<string | null>(null)

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Recipients</h1>
        {!adding && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              setAdding(true)
              setSavedName(null)
            }}
          >
            Add recipient
          </button>
        )}
      </div>

      {savedName && <div className="alert alert--success">{savedName} was added to your recipients.</div>}

      {adding && (
        <AddRecipientForm
          onCancel={() => setAdding(false)}
          onSaved={(recipient) => {
            setAdding(false)
            setSavedName(recipient.name)
          }}
        />
      )}

      {recipients.length === 0 ? (
        <p className="muted">You have not added anyone yet.</p>
      ) : (
        <ul className="card list">
          {recipients.map((recipient) => {
            const corridor = corridorById(recipient.corridorId)
            return (
              <li key={recipient.id} className="list__row">
                <div className="list__main">
                  <strong>{recipient.name}</strong>
                  <span className="muted small">{describePayout(recipient)}</span>
                </div>
                <div className="list__meta">
                  <span>{corridor?.country ?? recipient.corridorId}</span>
                  <span className="muted small">{DELIVERY_METHOD_LABELS[recipient.deliveryMethod]}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
