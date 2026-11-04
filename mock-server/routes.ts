import { validateRecipient } from '../src/features/recipients/validation'
import type { RecipientDraft } from '../src/features/recipients/validation'
import { DELIVERY_METHOD_LABELS, STATUS_LABELS } from '../src/types'
import type { DeliveryMethod, Recipient, TransferStatus } from '../src/types'
import { buildTransfer, getDb, nextId } from './db'
import { CORRIDOR_PRICING, findCorridor, isPromoEligible, PricingError, quoteFor, toCorridor } from './pricing'

export interface ApiRequest {
  method: string
  path: string
  query: URLSearchParams
  body: unknown
}

export interface ApiResponse {
  status: number
  body: unknown
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

type Params = Record<string, string>
type Handler = (req: ApiRequest, params: Params) => ApiResponse

const TRANSFER_STATUSES = Object.keys(STATUS_LABELS) as TransferStatus[]
const DELIVERY_METHODS = Object.keys(DELIVERY_METHOD_LABELS) as DeliveryMethod[]

const ok = (body: unknown, status = 200): ApiResponse => ({ status, body })

function field(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined
}

function stringField(body: unknown, key: string): string {
  const value = field(body, key)
  if (typeof value !== 'string' || !value) throw new HttpError(400, `${key} is required`)
  return value
}

function deliveryMethodField(body: unknown): DeliveryMethod {
  const value = field(body, 'deliveryMethod')
  if (!DELIVERY_METHODS.includes(value as DeliveryMethod)) {
    throw new HttpError(400, 'deliveryMethod must be bank, cash_pickup or mobile_wallet')
  }
  return value as DeliveryMethod
}

const listCorridors: Handler = () => ok(CORRIDOR_PRICING.map(toCorridor))

const createQuote: Handler = (req) => {
  const db = getDb()
  const corridorId = stringField(req.body, 'corridorId')
  const deliveryMethod = deliveryMethodField(req.body)
  const sendAmount = field(req.body, 'sendAmount')
  if (typeof sendAmount !== 'number') throw new HttpError(400, 'sendAmount must be a number of cents')

  const quote = quoteFor(
    { corridorId, deliveryMethod, sendAmount },
    { id: nextId(db, 'qt'), now: Date.now(), promoEligible: isPromoEligible(db.transfers, corridorId) },
  )
  db.quotes.set(quote.id, quote)
  return ok(quote, 201)
}

const listRecipients: Handler = () => ok([...getDb().recipients].sort((a, b) => a.name.localeCompare(b.name)))

const createRecipient: Handler = (req) => {
  const db = getDb()
  const draft: RecipientDraft = {
    name: String(field(req.body, 'name') ?? ''),
    corridorId: String(field(req.body, 'corridorId') ?? ''),
    deliveryMethod: deliveryMethodField(req.body),
    bankName: String(field(req.body, 'bankName') ?? ''),
    accountNumber: String(field(req.body, 'accountNumber') ?? ''),
    phone: String(field(req.body, 'phone') ?? ''),
  }

  const errors = Object.values(validateRecipient(draft))
  if (errors.length > 0) throw new HttpError(400, errors[0])

  const corridor = findCorridor(draft.corridorId)
  if (!corridor) throw new HttpError(400, 'Unknown country')
  if (corridor.fees[draft.deliveryMethod] === undefined) {
    throw new HttpError(400, `That delivery method is not available to ${corridor.country}`)
  }

  // Keep only the details the chosen delivery method uses.
  const recipient: Recipient = {
    id: nextId(db, 'rcp'),
    name: draft.name.trim(),
    corridorId: draft.corridorId,
    deliveryMethod: draft.deliveryMethod,
    ...(draft.deliveryMethod === 'bank' && {
      bankName: draft.bankName.trim(),
      accountNumber: draft.accountNumber.trim(),
    }),
    ...(draft.deliveryMethod === 'mobile_wallet' && { phone: draft.phone.trim() }),
    createdAt: new Date().toISOString(),
  }

  db.recipients.push(recipient)
  return ok(recipient, 201)
}

const listTransfers: Handler = (req) => {
  const status = req.query.get('status')
  if (status && !TRANSFER_STATUSES.includes(status as TransferStatus)) {
    throw new HttpError(400, `Unknown status ${status}`)
  }

  const transfers = getDb()
    .transfers.filter((t) => !status || t.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return ok(transfers)
}

const getTransfer: Handler = (_req, params) => {
  const transfer = getDb().transfers.find((t) => t.id === params.id)
  if (!transfer) throw new HttpError(404, 'Transfer not found')
  return ok(transfer)
}

const createTransfer: Handler = (req) => {
  const db = getDb()
  const quote = db.quotes.get(stringField(req.body, 'quoteId'))
  if (!quote) throw new HttpError(404, 'Quote not found. Get a new quote and try again.')
  if (Date.parse(quote.expiresAt) <= Date.now()) {
    throw new HttpError(410, 'This quote has expired. Get a new quote and try again.')
  }

  const recipient = db.recipients.find((r) => r.id === stringField(req.body, 'recipientId'))
  if (!recipient) throw new HttpError(404, 'Recipient not found')
  if (recipient.corridorId !== quote.corridorId || recipient.deliveryMethod !== quote.deliveryMethod) {
    throw new HttpError(400, 'This recipient cannot receive money by the quoted delivery method')
  }

  // Another transfer may have used up the promo since this quote was issued.
  if (quote.promoApplied && !isPromoEligible(db.transfers, quote.corridorId)) {
    db.quotes.delete(quote.id)
    throw new HttpError(409, 'The first-transfer offer was already used. Get a new quote and try again.')
  }

  const transfer = buildTransfer(db, quote, recipient, [{ status: 'pending', at: new Date().toISOString() }])
  db.transfers.push(transfer)
  db.quotes.delete(quote.id)
  return ok(transfer, 201)
}

const ROUTES: [method: string, pattern: string, handler: Handler][] = [
  ['GET', '/corridors', listCorridors],
  ['POST', '/quotes', createQuote],
  ['GET', '/recipients', listRecipients],
  ['POST', '/recipients', createRecipient],
  ['GET', '/transfers', listTransfers],
  ['GET', '/transfers/:id', getTransfer],
  ['POST', '/transfers', createTransfer],
]

function matchPath(pattern: string, path: string): Params | null {
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}/?$`)
  const match = regex.exec(path)
  return match ? { ...match.groups } : null
}

export function handleRequest(req: ApiRequest): ApiResponse {
  for (const [method, pattern, handler] of ROUTES) {
    const params = method === req.method ? matchPath(pattern, req.path) : null
    if (!params) continue

    try {
      return handler(req, params)
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status, body: { error: err.message } }
      if (err instanceof PricingError) return { status: 400, body: { error: err.message } }
      throw err
    }
  }

  return { status: 404, body: { error: `No route for ${req.method} ${req.path}` } }
}
