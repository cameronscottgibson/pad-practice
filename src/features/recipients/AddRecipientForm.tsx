import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from '../../api/client'
import { useAppData } from '../../state/AppData'
import { DELIVERY_METHOD_LABELS } from '../../types'
import type { DeliveryMethod, Recipient } from '../../types'
import { emptyDraft, validateRecipient } from './validation'
import type { RecipientDraft } from './validation'

interface AddRecipientFormProps {
  onSaved: (recipient: Recipient) => void
  onCancel: () => void
}

export default function AddRecipientForm({ onSaved, onCancel }: AddRecipientFormProps) {
  const { corridors, corridorById, addRecipient } = useAppData()
  const [draft, setDraft] = useState<RecipientDraft>(emptyDraft)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const methods = corridorById(draft.corridorId)?.deliveryMethods ?? []
  // Show errors only after the first submit, then keep them current.
  const errors = submitted ? validateRecipient(draft) : {}

  const update = (changes: Partial<RecipientDraft>) => setDraft((current) => ({ ...current, ...changes }))

  function handleCountryChange(corridorId: string) {
    const available = corridorById(corridorId)?.deliveryMethods ?? []
    const deliveryMethod = methods.includes(draft.deliveryMethod) ? draft.deliveryMethod : (available[0] ?? 'bank')
    update({ corridorId, deliveryMethod })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateRecipient(draft)).length > 0) return

    setSaving(true)
    setSaveError(null)
    try {
      onSaved(await addRecipient(draft))
    } catch (err) {
      setSaveError(errorMessage(err))
      setSaving(false)
    }
  }

  const fieldError = (name: keyof RecipientDraft) =>
    errors[name] && (
      <p id={`${name}-error`} className="field__error">
        {errors[name]}
      </p>
    )

  const inputProps = (name: 'name' | 'bankName' | 'accountNumber' | 'phone') => ({
    id: name,
    value: draft[name],
    onChange: (e: { target: { value: string } }) => update({ [name]: e.target.value }),
    'aria-invalid': errors[name] !== undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  })

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2 className="card__title">New recipient</h2>

      <div className="field">
        <label htmlFor="name">Full name</label>
        <input {...inputProps('name')} autoComplete="off" placeholder="As it appears on their ID" />
        {fieldError('name')}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="corridorId">Country</label>
          <select
            id="corridorId"
            value={draft.corridorId}
            onChange={(e) => handleCountryChange(e.target.value)}
            aria-invalid={errors.corridorId !== undefined}
          >
            <option value="">Choose a country</option>
            {corridors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.country}
              </option>
            ))}
          </select>
          {fieldError('corridorId')}
        </div>

        <div className="field">
          <label htmlFor="deliveryMethod">Delivery method</label>
          <select
            id="deliveryMethod"
            value={draft.deliveryMethod}
            disabled={methods.length === 0}
            onChange={(e) => update({ deliveryMethod: e.target.value as DeliveryMethod })}
          >
            {(methods.length > 0 ? methods : [draft.deliveryMethod]).map((method) => (
              <option key={method} value={method}>
                {DELIVERY_METHOD_LABELS[method]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {draft.deliveryMethod === 'bank' && (
        <div className="field-row">
          <div className="field">
            <label htmlFor="bankName">Bank name</label>
            <input {...inputProps('bankName')} autoComplete="off" />
            {fieldError('bankName')}
          </div>
          <div className="field">
            <label htmlFor="accountNumber">Account number</label>
            <input {...inputProps('accountNumber')} inputMode="numeric" autoComplete="off" />
            {fieldError('accountNumber')}
          </div>
        </div>
      )}

      {draft.deliveryMethod === 'mobile_wallet' && (
        <div className="field">
          <label htmlFor="phone">Mobile number</label>
          <input {...inputProps('phone')} type="tel" autoComplete="off" placeholder="+63 917 555 0142" />
          {fieldError('phone')}
        </div>
      )}

      {draft.deliveryMethod === 'cash_pickup' && (
        <p className="muted small">They can collect cash at any partner location with a valid photo ID.</p>
      )}

      {saveError && <div className="alert alert--error">{saveError}</div>}

      <div className="form__actions">
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save recipient'}
        </button>
      </div>
    </form>
  )
}
