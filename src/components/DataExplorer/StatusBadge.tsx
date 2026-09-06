import type { LeadStatus } from '../../data/types';
import { STATUS_LABELS } from '../../data/transformations';

const STATUS_CLASS: Record<LeadStatus, string> = {
  new: 'status-badge--new',
  contacted: 'status-badge--contacted',
  test_drive: 'status-badge--test-drive',
  negotiation: 'status-badge--negotiation',
  order_placed: 'status-badge--order-placed',
  delivered: 'status-badge--delivered',
  lost: 'status-badge--lost',
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`status-badge ${STATUS_CLASS[status]}`}>{STATUS_LABELS[status]}</span>;
}
