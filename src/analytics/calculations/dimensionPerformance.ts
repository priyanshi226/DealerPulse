// The reusable "Performance Explorer" engine. One function computes every
// per-entity metric (leads, delivered, revenue, conversion, pipeline, lost,
// cycle time, stale/overdue) for whichever dimension the user picks — Branch,
// Rep, Source, or Model — instead of four near-identical hand-built sections
// (spec sections 9-12 and 15-18 collapse into this single component).

import { SOURCE_LABELS } from '../../data/transformations';
import type { Delivery, EnrichedLead } from '../../data/types';
import type { PerformanceDimension } from '../types';
import { MIN_SAMPLE_SIZE, STALE_THRESHOLD_DAYS, daysBetween, isActive, median, pct, sumBy } from './core';
import type { TargetRow } from './targets';

export interface DimensionPerformanceRow {
  key: string;
  label: string;
  branchId?: string;
  leadCount: number;
  deliveredCount: number;
  revenue: number;
  avgDealValue: number | null;
  conversionPct: number | null;
  lowSample: boolean;
  lostCount: number;
  lossRatePct: number | null;
  pipelineValue: number;
  medianCycleDays: number | null;
  staleCount: number;
  overdueCount: number;
  // Branch-only, populated when target data is applicable for this filter selection.
  targetRevenue?: number;
  targetAchievementPct?: number | null;
  revenueGap?: number;
  medianDeliveryDays?: number | null;
}

function keyFor(lead: EnrichedLead, dim: PerformanceDimension): string {
  switch (dim) {
    case 'branch':
      return lead.branch_id;
    case 'rep':
      return lead.assigned_to;
    case 'source':
      return lead.source;
    case 'model':
      return lead.model_interested;
  }
}

function labelFor(lead: EnrichedLead, dim: PerformanceDimension): string {
  switch (dim) {
    case 'branch':
      return `${lead.branch_id} — ${lead.branchName}`;
    case 'rep':
      return `${lead.assigned_to} — ${lead.repName}`;
    case 'source':
      return SOURCE_LABELS[lead.source] ?? lead.source;
    case 'model':
      return lead.model_interested;
  }
}

export function calculateDimensionPerformance(
  filteredLeads: EnrichedLead[],
  deliveries: Delivery[],
  dim: PerformanceDimension,
  referenceNowIso: string,
  targetRowsByBranch?: TargetRow[],
): DimensionPerformanceRow[] {
  const deliveryByLeadId = new Map(deliveries.map((d) => [d.lead_id, d]));
  const groups = new Map<string, { label: string; branchId?: string; leads: EnrichedLead[] }>();

  for (const lead of filteredLeads) {
    const key = keyFor(lead, dim);
    const existing = groups.get(key);
    if (existing) existing.leads.push(lead);
    else groups.set(key, { label: labelFor(lead, dim), branchId: dim === 'rep' ? lead.branch_id : undefined, leads: [lead] });
  }

  const targetByKey = new Map((targetRowsByBranch ?? []).map((r) => [r.key, r]));
  const referenceNow = new Date(referenceNowIso).getTime();

  const rows: DimensionPerformanceRow[] = Array.from(groups.entries()).map(([key, group]) => {
    const leads = group.leads;
    const delivered = leads.filter((l) => l.status === 'delivered');
    const lost = leads.filter((l) => l.status === 'lost');
    const active = leads.filter(isActive);
    const revenue = sumBy(delivered, (l) => l.deal_value);

    const cycleDays = delivered
      .map((l) => {
        const delivery = deliveryByLeadId.get(l.id);
        return delivery ? daysBetween(l.created_at, delivery.delivery_date) : null;
      })
      .filter((d): d is number => d !== null);

    const staleCount = active.filter((l) => daysBetween(l.last_activity_at, referenceNowIso) >= STALE_THRESHOLD_DAYS).length;
    const overdueCount = active.filter((l) => new Date(l.expected_close_date).getTime() < referenceNow).length;

    const row: DimensionPerformanceRow = {
      key,
      label: group.label,
      branchId: group.branchId,
      leadCount: leads.length,
      deliveredCount: delivered.length,
      revenue,
      avgDealValue: delivered.length ? revenue / delivered.length : null,
      conversionPct: pct(delivered.length, leads.length),
      lowSample: leads.length < MIN_SAMPLE_SIZE,
      lostCount: lost.length,
      lossRatePct: pct(lost.length, leads.length),
      pipelineValue: sumBy(active, (l) => l.deal_value),
      medianCycleDays: median(cycleDays),
      staleCount,
      overdueCount,
    };

    if (dim === 'branch') {
      const target = targetByKey.get(key);
      if (target) {
        row.targetRevenue = target.targetRevenue;
        row.targetAchievementPct = target.revenueAchievementPct;
        row.revenueGap = target.revenueGap;
      }
      const deliveryDays = delivered
        .map((l) => deliveryByLeadId.get(l.id)?.days_to_deliver)
        .filter((d): d is number => d !== undefined);
      row.medianDeliveryDays = median(deliveryDays);
    }

    return row;
  });

  return rows;
}

export function sortRows(
  rows: DimensionPerformanceRow[],
  metric: 'leads' | 'delivered' | 'revenue' | 'conversion' | 'pipeline' | 'targetAchievement',
): DimensionPerformanceRow[] {
  const value = (r: DimensionPerformanceRow): number => {
    switch (metric) {
      case 'leads':
        return r.leadCount;
      case 'delivered':
        return r.deliveredCount;
      case 'revenue':
        return r.revenue;
      case 'conversion':
        return r.conversionPct ?? -1;
      case 'pipeline':
        return r.pipelineValue;
      case 'targetAchievement':
        return r.targetAchievementPct ?? -1;
    }
  };
  return [...rows].sort((a, b) => value(b) - value(a));
}
