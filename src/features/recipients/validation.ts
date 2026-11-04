import type { DeliveryMethod } from '../../types'

// Shared by the add form and the mock API, so both sides agree on the rules.

export interface RecipientDraft {
  name: string
  corridorId: string
  deliveryMethod: DeliveryMethod
  bankName: string
  accountNumber: string
  phone: string
}

export type RecipientErrors = Partial<Record<keyof RecipientDraft, string>>

export const emptyDraft: RecipientDraft = {
  name: '',
  corridorId: '',
  deliveryMethod: 'bank',
  bankName: '',
  accountNumber: '',
  phone: '',
}

const ACCOUNT_NUMBER = /^\d{6,20}$/
const PHONE_CHARS = /^\+?[\d\s()-]+$/

export function validateRecipient(draft: RecipientDraft): RecipientErrors {
  const errors: RecipientErrors = {}

  if (!draft.name.trim()) {
    errors.name = 'Enter the recipient’s full name.'
  }

  if (!draft.corridorId) {
    errors.corridorId = 'Choose a country.'
  }

  if (draft.deliveryMethod === 'bank') {
    if (!draft.bankName.trim()) {
      errors.bankName = 'Enter the bank name.'
    }
    const account = draft.accountNumber.trim()
    if (!account) {
      errors.accountNumber = 'Enter the account number.'
    } else if (!ACCOUNT_NUMBER.test(account)) {
      errors.accountNumber = 'Account number must be 6 to 20 digits, with no spaces or dashes.'
    }
  }

  if (draft.deliveryMethod === 'mobile_wallet') {
    const phone = draft.phone.trim()
    const digits = phone.replace(/\D/g, '')
    if (!phone) {
      errors.phone = 'Enter the mobile number linked to the wallet.'
    } else if (!PHONE_CHARS.test(phone) || digits.length < 8 || digits.length > 15) {
      errors.phone = 'Enter a valid mobile number, including the country code.'
    }
  }

  return errors
}
