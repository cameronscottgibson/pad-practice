import { describe, expect, it } from 'vitest'
import { emptyDraft, validateRecipient } from './validation'
import type { RecipientDraft } from './validation'

const draft = (overrides: Partial<RecipientDraft>): RecipientDraft => ({
  ...emptyDraft,
  name: 'Lucía Hernández',
  corridorId: 'us-mx',
  deliveryMethod: 'cash_pickup',
  ...overrides,
})

describe('validateRecipient', () => {
  it('requires a name', () => {
    expect(validateRecipient(draft({ name: '  ' })).name).toBeDefined()
    expect(validateRecipient(draft({}))).toEqual({})
  })

  it('requires a country', () => {
    expect(validateRecipient(draft({ corridorId: '' })).corridorId).toBeDefined()
  })

  it('requires a bank name and a digits-only account number for bank delivery', () => {
    const bank = { deliveryMethod: 'bank' as const, bankName: 'BBVA México' }
    expect(validateRecipient(draft({ ...bank, accountNumber: '' })).accountNumber).toBeDefined()
    expect(validateRecipient(draft({ ...bank, accountNumber: '1234-5678' })).accountNumber).toBeDefined()
    expect(validateRecipient(draft({ ...bank, accountNumber: '12345678ab' })).accountNumber).toBeDefined()
    expect(validateRecipient(draft({ ...bank, accountNumber: '012180001234567890' }))).toEqual({})
    expect(validateRecipient(draft({ ...bank, bankName: '', accountNumber: '12345678' })).bankName).toBeDefined()
  })

  it('does not ask for an account number for other methods', () => {
    expect(validateRecipient(draft({ deliveryMethod: 'cash_pickup', accountNumber: '' }))).toEqual({})
  })

  it('requires a valid phone number for mobile wallet delivery', () => {
    const wallet = { corridorId: 'us-ph', deliveryMethod: 'mobile_wallet' as const }
    expect(validateRecipient(draft({ ...wallet, phone: '' })).phone).toBeDefined()
    expect(validateRecipient(draft({ ...wallet, phone: 'call me' })).phone).toBeDefined()
    expect(validateRecipient(draft({ ...wallet, phone: '+63 917 555 0142' }))).toEqual({})
  })
})
