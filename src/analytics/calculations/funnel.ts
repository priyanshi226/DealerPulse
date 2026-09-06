import type { EnrichedLead, LeadStatus } from '../../data/types';
import { STATUS_LABELS } from '../../data/transformations';
import { pct } from './core';

// Funnel stages only — "lost" is an exit, not a stage a lead progresses
// through, so it's excluded from the historical funnel (it still drives the
// Lost Analysis section separately).
const FUNNEL_STAGES: LeadStatus[] = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed', 'delivered'];

export interface FunnelStageRow {
  status: LeadStatus;
  label: string;
  reachedCount: number;
  conversionFromPrevPct: number | null;
  dropOffFromPrevPct: number | null;
}

export interface FunnelResult {
  stages: FunnelStageRow[];
  largestDropOff: { fromLabel: string; toLabel: string; dropOffPct: number } | null;
}

/**
 * Reached-stage funnel: a lead counts in every stage its status_history ever
 * recorded, regardless of where it currently sits (so a delivered lead counts
 * in every earlier stage too, and a lost lead still counts in whatever stages
 * it reached before exiting). History is verified monotonic in this dataset,
 * so "reached" is just "appears anywhere in status_history".
 */
export function calculateHistoricalFunnel(filteredLeads: EnrichedLead[]): FunnelResult {
  const stages: FunnelStageRow[] = FUNNEL_STAGES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    reachedCount: filteredLeads.filter((l) => l.status_history.some((h) => h.status === status)).length,
    conversionFromPrevPct: null,
    dropOffFromPrevPct: null,
  }));

  for (let i = 1; i < stages.length; i++) {
    const conversion = pct(stages[i].reachedCount, stages[i - 1].reachedCount);
    stages[i].conversionFromPrevPct = conversion;
    stages[i].dropOffFromPrevPct = conversion === null ? null : 100 - conversion;
  }

  let largestDropOff: FunnelResult['largestDropOff'] = null;
  for (let i = 1; i < stages.length; i++) {
    const dropOff = stages[i].dropOffFromPrevPct;
    if (dropOff !== null && (largestDropOff === null || dropOff > largestDropOff.dropOffPct)) {
      largestDropOff = { fromLabel: stages[i - 1].label, toLabel: stages[i].label, dropOffPct: dropOff };
    }
  }

  return { stages, largestDropOff };
}
