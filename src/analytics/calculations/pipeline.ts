import { STATUS_LABELS, STATUS_ORDER } from '../../data/transformations';
import type { EnrichedLead, LeadStatus } from '../../data/types';
import { sumBy } from './core';

export interface StatusDistributionRow {
  status: LeadStatus;
  label: string;
  count: number;
  value: number;
}

/**
 * Current-status distribution — "where are leads sitting right now" (all 7
 * statuses, by current `lead.status`). Pipeline VALUE by stage (spec's
 * "high-value pipeline" view) is the same calculation with the delivered/lost
 * rows dropped at render time, since a closed lead isn't "pipeline" anymore —
 * one calculation backs both a Lead Count and a Pipeline Value toggle.
 */
export function calculateCurrentPipeline(filteredLeads: EnrichedLead[]): StatusDistributionRow[] {
  return STATUS_ORDER.map((status) => {
    const leads = filteredLeads.filter((l) => l.status === status);
    return {
      status,
      label: STATUS_LABELS[status],
      count: leads.length,
      value: sumBy(leads, (l) => l.deal_value),
    };
  });
}
