import type { EnrichedLead } from '../../data/types';
import { groupBy, sumBy } from './core';

const NOT_SPECIFIED = 'Not specified';

export interface LossReasonRow {
  reason: string;
  count: number;
  revenue: number;
}

export interface LossAnalysisResult {
  totalLostCount: number;
  totalLostRevenue: number;
  reasons: LossReasonRow[];
}

/** Lost leads grouped by reason. A handful of lost leads in this dataset have
 * no recorded reason (faded out rather than an explicit disqualification) —
 * those are kept as "Not specified" rather than dropped, so counts still
 * reconcile with the overview's Lost Leads KPI. */
export function calculateLossAnalysis(filteredLeads: EnrichedLead[]): LossAnalysisResult {
  const lost = filteredLeads.filter((l) => l.status === 'lost');
  const groups = groupBy(lost, (l) => l.lost_reason ?? NOT_SPECIFIED);

  const reasons = Array.from(groups.entries())
    .map(([reason, leads]) => ({ reason, count: leads.length, revenue: sumBy(leads, (l) => l.deal_value) }))
    .sort((a, b) => b.count - a.count);

  return {
    totalLostCount: lost.length,
    totalLostRevenue: sumBy(lost, (l) => l.deal_value),
    reasons,
  };
}
