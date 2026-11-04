import { DELIVERY_METHOD_LABELS } from '../../types'
import type { Recipient } from '../../types'

export function maskAccountNumber(accountNumber: string): string {
  return `•••• ${accountNumber.slice(-4)}`
}

/** A one-line summary of where the money goes, such as "BBVA México •••• 7890". */
export function describePayout(recipient: Recipient): string {
  switch (recipient.deliveryMethod) {
    case 'bank':
      return `${recipient.bankName ?? 'Bank'} ${maskAccountNumber(recipient.accountNumber ?? '')}`
    case 'mobile_wallet':
      return `Wallet ${recipient.phone ?? ''}`.trim()
    case 'cash_pickup':
      return DELIVERY_METHOD_LABELS.cash_pickup
  }
}
