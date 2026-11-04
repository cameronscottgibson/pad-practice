import type { Quote, Recipient, Transfer, TransferEvent, TransferStatus } from '../src/types'
import { isPromoEligible, quoteFor } from './pricing'

export interface Db {
  recipients: Recipient[]
  transfers: Transfer[]
  quotes: Map<string, Quote>
  nextId: number
}

// The dev server reloads route modules when they change. Keeping the store on
// globalThis means data created while developing survives those reloads.
const store = globalThis as typeof globalThis & { __sendwellDb?: Db }

export function getDb(): Db {
  store.__sendwellDb ??= seed(Date.now())
  return store.__sendwellDb
}

export function nextId(db: Db, prefix: string): string {
  db.nextId += 1
  return `${prefix}_${db.nextId}`
}

/** Books a transfer at the quoted price. The caller stores it. */
export function buildTransfer(db: Db, quote: Quote, recipient: Recipient, events: TransferEvent[]): Transfer {
  const { id: quoteId, createdAt: _quotedAt, expiresAt: _expiresAt, ...terms } = quote
  const latest = events[events.length - 1]
  return {
    ...terms,
    // Pay out at the rate the customer locked in.
    receiveAmount: Math.round(terms.sendAmount * terms.rate),
    id: nextId(db, 'trf'),
    reference: `SW-${48201 + db.transfers.length}`,
    quoteId,
    recipientId: recipient.id,
    recipientName: recipient.name,
    status: latest.status,
    createdAt: events[0].at,
    updatedAt: latest.at,
    events,
  }
}

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

const SEED_RECIPIENTS: Omit<Recipient, 'createdAt'>[] = [
  { id: 'rcp_1', name: 'Lucía Hernández', corridorId: 'us-mx', deliveryMethod: 'bank', bankName: 'BBVA México', accountNumber: '012180001234567890' },
  { id: 'rcp_2', name: 'Miguel Torres', corridorId: 'us-mx', deliveryMethod: 'cash_pickup' },
  { id: 'rcp_3', name: 'Maria Santos', corridorId: 'us-ph', deliveryMethod: 'mobile_wallet', phone: '+63 917 555 0142' },
  { id: 'rcp_4', name: 'Jose Reyes', corridorId: 'us-ph', deliveryMethod: 'bank', bankName: 'BDO Unibank', accountNumber: '004560789012' },
  { id: 'rcp_5', name: 'Priya Sharma', corridorId: 'us-in', deliveryMethod: 'bank', bankName: 'HDFC Bank', accountNumber: '50100234567891' },
  { id: 'rcp_6', name: 'Kenji Watanabe', corridorId: 'us-jp', deliveryMethod: 'bank', bankName: 'MUFG Bank', accountNumber: '3021457' },
]

// [recipient, send amount in cents, current status, days ago]
const SEED_TRANSFERS: [string, number, TransferStatus, number][] = [
  ['rcp_1', 50000, 'delivered', 58],
  ['rcp_3', 20000, 'delivered', 51],
  ['rcp_5', 100000, 'delivered', 44],
  ['rcp_2', 15000, 'cancelled', 37],
  ['rcp_1', 45000, 'delivered', 30],
  ['rcp_3', 25000, 'failed', 24],
  ['rcp_4', 30000, 'delivered', 17],
  ['rcp_5', 120000, 'delivered', 10],
  ['rcp_2', 20000, 'failed', 6],
  ['rcp_3', 22500, 'processing', 2],
  ['rcp_1', 60000, 'processing', 1],
  ['rcp_5', 75000, 'pending', 0],
]

function eventsFor(status: TransferStatus, createdAt: number): TransferEvent[] {
  const at = (offset: number) => new Date(createdAt + offset).toISOString()
  const events: TransferEvent[] = [{ status: 'pending', at: at(0) }]

  if (status === 'cancelled') events.push({ status, at: at(HOUR / 2), note: 'Cancelled by you' })
  if (status === 'processing' || status === 'delivered' || status === 'failed') {
    events.push({ status: 'processing', at: at(HOUR / 4) })
  }
  if (status === 'delivered') events.push({ status, at: at(5 * HOUR) })
  if (status === 'failed') events.push({ status, at: at(9 * HOUR), note: 'Returned by the receiving bank' })
  return events
}

function seed(now: number): Db {
  const db: Db = { recipients: [], transfers: [], quotes: new Map(), nextId: 0 }

  db.recipients = SEED_RECIPIENTS.map((r, i) => ({ ...r, createdAt: new Date(now - (90 - i * 5) * DAY).toISOString() }))

  for (const [i, [recipientId, sendAmount, status, daysAgo]] of SEED_TRANSFERS.entries()) {
    const recipient = db.recipients.find((r) => r.id === recipientId)!
    const createdAt = now - daysAgo * DAY - ((i % 4) * 3 + 1) * HOUR
    const quote = quoteFor(
      { corridorId: recipient.corridorId, deliveryMethod: recipient.deliveryMethod, sendAmount },
      { id: nextId(db, 'qt'), now: createdAt, promoEligible: isPromoEligible(db.transfers, recipient.corridorId) },
    )
    db.transfers.push(buildTransfer(db, quote, recipient, eventsFor(status, createdAt)))
  }

  return db
}
