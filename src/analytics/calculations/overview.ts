import type { DealershipDataset, EnrichedLead } from '../../data/types';
import type { AnalyticsFilterState } from '../types';
import { isActive, pct, sumBy } from './core';
import { calculateTargetPerformance } from './targets';

export interface OverviewResult {
  totalLeads: number;
  deliveredUnits: number;
  deliveredRevenue: number;
  activePipelineValue: number;
  conversionPct: number | null;
  lostCount: number;
  lossRatePct: number | null;
  targetAchievementPct: number | null;
  targetNotApplicableReason: string | null;
}

export function calculateOverview(
  filteredLeads: EnrichedLead[],
  raw: DealershipDataset,
  filters: AnalyticsFilterState,
): OverviewResult {
  const totalLeads = filteredLeads.length;
  const delivered = filteredLeads.filter((l) => l.status === 'delivered');
  const lost = filteredLeads.filter((l) => l.status === 'lost');
  const active = filteredLeads.filter(isActive);

  const targetPerf = calculateTargetPerformance(raw, filters, 'branch');

  return {
    totalLeads,
    deliveredUnits: delivered.length,
    deliveredRevenue: sumBy(delivered, (l) => l.deal_value),
    activePipelineValue: sumBy(active, (l) => l.deal_value),
    conversionPct: pct(delivered.length, totalLeads),
    lostCount: lost.length,
    lossRatePct: pct(lost.length, totalLeads),
    targetAchievementPct: targetPerf.applicable ? targetPerf.totals.revenueAchievementPct : null,
    targetNotApplicableReason: targetPerf.applicable ? null : targetPerf.reason,
  };
}
