import { STATUS_LABELS } from '../../types'
import type { TransferStatus } from '../../types'

export default function StatusBadge({ status }: { status: TransferStatus }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABELS[status]}</span>
}
