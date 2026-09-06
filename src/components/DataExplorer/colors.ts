import type { LeadStatus } from '../../data/types';

// Semantic, low-saturation status colors. Meaning stays constant everywhere
// a status appears (badge, group header, legend) — color is a scanning aid,
// not decoration, so it stays out of full-row backgrounds.
export const STATUS_COLOR_VARS: Record<LeadStatus, string> = {
  new: 'var(--status-new)',
  contacted: 'var(--status-contacted)',
  test_drive: 'var(--status-test-drive)',
  negotiation: 'var(--status-negotiation)',
  order_placed: 'var(--status-order-placed)',
  delivered: 'var(--status-delivered)',
  lost: 'var(--status-lost)',
};

// A fixed categorical palette assigned to branches by their position in the
// dataset's branch list, so the same branch always gets the same color no
// matter which view is active.
const BRANCH_PALETTE = [
  'var(--branch-1)',
  'var(--branch-2)',
  'var(--branch-3)',
  'var(--branch-4)',
  'var(--branch-5)',
  'var(--branch-6)',
];

export function branchColorVar(branchIndex: number): string {
  return BRANCH_PALETTE[branchIndex % BRANCH_PALETTE.length];
}
