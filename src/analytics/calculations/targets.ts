// Target vs Actual is its own analytical grain (see filters.ts's module
// comment): a target row is defined by branch + month, independent of any
// individual lead's attributes beyond branch. So this file does NOT consume
// the shared `filteredLeads` cohort — it re-derives its own delivered-lead
// scope, because comparing (say) one rep's delivered revenue against a
// whole-branch monthly target would misattribute the target.
//
// Rule: targets are only meaningful when the filter selection is expressible
// in terms of branch + date — the moment a rep/source/model/status filter is
// active, "the applicable target" no longer has a defensible definition, so
// we report `applicable: false` instead of fabricating a number (spec: don't
// invent a target achievement figure when it can't be attributed correctly).

import type { DealershipDataset } from '../../data/types';
import type { AnalyticsFilterState } from '../types';
import { pct, sum, sumBy } from './core';

export interface TargetRow {
  key: string;
  label: string;
  actualRevenue: number;
  targetRevenue: number;
  revenueAchievementPct: number | null;
  revenueGap: number;
  actualUnits: number;
  targetUnits: number;
  unitAchievementPct: number | null;
  unitGap: number;
}

export interface TargetPerformanceResult {
  applicable: boolean;
  reason: string | null;
  rows: TargetRow[];
  totals: {
    actualRevenue: number;
    targetRevenue: number;
    revenueAchievementPct: number | null;
    actualUnits: number;
    targetUnits: number;
    unitAchievementPct: number | null;
  };
}

const EMPTY_TOTALS = {
  actualRevenue: 0,
  targetRevenue: 0,
  revenueAchievementPct: null,
  actualUnits: 0,
  targetUnits: 0,
  unitAchievementPct: null,
};

function monthOverlapsRange(month: string, dateFrom: string | null, dateTo: string | null): boolean {
  const [year, mon] = month.split('-').map(Number);
  const monthStart = new Date(year, mon - 1, 1).getTime();
  const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999).getTime();
  if (dateFrom && monthEnd < new Date(dateFrom).getTime()) return false;
  if (dateTo && monthStart > new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
  return true;
}

export function calculateTargetPerformance(
  raw: DealershipDataset,
  filters: AnalyticsFilterState,
  breakdownBy: 'branch' | 'month',
): TargetPerformanceResult {
  if (filters.repIds.length || filters.sources.length || filters.models.length || filters.statuses.length) {
    return {
      applicable: false,
      reason:
        'Targets are set per branch per month. Clear the rep, source, model, and status filters to see target achievement for this selection.',
      rows: [],
      totals: EMPTY_TOTALS,
    };
  }

  const scopedBranchIds = filters.branchIds.length ? filters.branchIds : raw.branches.map((b) => b.id);
  const branchNameById = new Map(raw.branches.map((b) => [b.id, b.name]));

  const scopedTargets = raw.targets.filter(
    (t) => scopedBranchIds.includes(t.branch_id) && monthOverlapsRange(t.month, filters.dateFrom, filters.dateTo),
  );

  const deliveryByLeadId = new Map(raw.deliveries.map((d) => [d.lead_id, d]));
  const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

  const deliveredInScope = raw.leads
    .filter((l) => l.status === 'delivered' && scopedBranchIds.includes(l.branch_id))
    .map((l) => ({ lead: l, delivery: deliveryByLeadId.get(l.id) }))
    .filter((entry): entry is { lead: (typeof raw.leads)[number]; delivery: NonNullable<typeof entry.delivery> } =>
      Boolean(entry.delivery),
    )
    .filter(({ delivery }) => {
      const deliveredAt = new Date(delivery.delivery_date).getTime();
      if (from !== null && deliveredAt < from) return false;
      if (to !== null && deliveredAt > to) return false;
      return true;
    });

  function buildRow(key: string, label: string, targets: typeof scopedTargets, delivered: typeof deliveredInScope): TargetRow {
    const targetRevenue = sumBy(targets, (t) => t.target_revenue);
    const targetUnits = sumBy(targets, (t) => t.target_units);
    const actualRevenue = sumBy(delivered, ({ lead }) => lead.deal_value);
    const actualUnits = delivered.length;
    return {
      key,
      label,
      actualRevenue,
      targetRevenue,
      revenueAchievementPct: pct(actualRevenue, targetRevenue),
      revenueGap: actualRevenue - targetRevenue,
      actualUnits,
      targetUnits,
      unitAchievementPct: pct(actualUnits, targetUnits),
      unitGap: actualUnits - targetUnits,
    };
  }

  let rows: TargetRow[];
  if (breakdownBy === 'branch') {
    rows = scopedBranchIds
      .map((branchId) =>
        buildRow(
          branchId,
          `${branchId} — ${branchNameById.get(branchId) ?? branchId}`,
          scopedTargets.filter((t) => t.branch_id === branchId),
          deliveredInScope.filter(({ lead }) => lead.branch_id === branchId),
        ),
      )
      .filter((r) => r.targetRevenue > 0 || r.actualRevenue > 0);
  } else {
    const months = Array.from(new Set(scopedTargets.map((t) => t.month))).sort();
    rows = months.map((month) =>
      buildRow(
        month,
        new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        scopedTargets.filter((t) => t.month === month),
        deliveredInScope.filter(({ delivery }) => delivery.delivery_date.slice(0, 7) === month),
      ),
    );
  }

  const targetRevenue = sum(rows.map((r) => r.targetRevenue));
  const actualRevenue = sum(rows.map((r) => r.actualRevenue));
  const targetUnits = sum(rows.map((r) => r.targetUnits));
  const actualUnits = sum(rows.map((r) => r.actualUnits));

  return {
    applicable: true,
    reason: null,
    rows,
    totals: {
      actualRevenue,
      targetRevenue,
      revenueAchievementPct: pct(actualRevenue, targetRevenue),
      actualUnits,
      targetUnits,
      unitAchievementPct: pct(actualUnits, targetUnits),
    },
  };
}
