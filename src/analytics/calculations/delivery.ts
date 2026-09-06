import type { Delivery, EnrichedLead } from '../../data/types';
import { average, groupBy, median, sumBy } from './core';

export interface DeliveryDelayReasonRow {
  reason: string;
  count: number;
}

export interface DeliveryByDimensionRow {
  key: string;
  label: string;
  medianDays: number | null;
  count: number;
}

export interface DeliveryTimeBucketRow {
  key: string;
  label: string;
  count: number;
}

export interface DeliveryAnalyticsResult {
  deliveriesCount: number;
  medianDays: number | null;
  averageDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
  revenue: number;
  delayReasons: DeliveryDelayReasonRow[];
  byBranch: DeliveryByDimensionRow[];
  byModel: DeliveryByDimensionRow[];
  timeBuckets: DeliveryTimeBucketRow[];
}

const TIME_BUCKETS: { key: string; label: string; min: number; max: number }[] = [
  { key: '0-7', label: '0–7 days', min: 0, max: 7 },
  { key: '8-14', label: '8–14 days', min: 8, max: 14 },
  { key: '15-21', label: '15–21 days', min: 15, max: 21 },
  { key: '22-30', label: '22–30 days', min: 22, max: 30 },
  { key: '30+', label: '30+ days', min: 31, max: Infinity },
];

/** Deliveries are already scoped to the filtered lead cohort via lead_id
 * (see filters.ts `filterDeliveries`) — this only aggregates them. */
export function calculateDeliveryAnalytics(
  filteredLeads: EnrichedLead[],
  filteredDeliveries: Delivery[],
): DeliveryAnalyticsResult {
  const leadById = new Map(filteredLeads.map((l) => [l.id, l]));
  const days = filteredDeliveries.map((d) => d.days_to_deliver);
  const revenue = sumBy(filteredDeliveries, (d) => leadById.get(d.lead_id)?.deal_value ?? 0);

  const delayed = filteredDeliveries.filter((d) => d.delay_reason);
  const delayGroups = groupBy(delayed, (d) => d.delay_reason as string);
  const delayReasons = Array.from(delayGroups.entries())
    .map(([reason, ds]) => ({ reason, count: ds.length }))
    .sort((a, b) => b.count - a.count);

  function byDimension(
    keyFn: (lead: EnrichedLead) => string,
    labelFn: (lead: EnrichedLead) => string,
  ): DeliveryByDimensionRow[] {
    const groups = new Map<string, { label: string; days: number[] }>();
    for (const delivery of filteredDeliveries) {
      const lead = leadById.get(delivery.lead_id);
      if (!lead) continue;
      const key = keyFn(lead);
      const group = groups.get(key);
      if (group) group.days.push(delivery.days_to_deliver);
      else groups.set(key, { label: labelFn(lead), days: [delivery.days_to_deliver] });
    }
    return Array.from(groups.entries()).map(([key, g]) => ({
      key,
      label: g.label,
      medianDays: median(g.days),
      count: g.days.length,
    }));
  }

  return {
    deliveriesCount: filteredDeliveries.length,
    medianDays: median(days),
    averageDays: average(days),
    fastestDays: days.length ? Math.min(...days) : null,
    slowestDays: days.length ? Math.max(...days) : null,
    revenue,
    delayReasons,
    byBranch: byDimension(
      (l) => l.branch_id,
      (l) => `${l.branch_id} — ${l.branchName}`,
    ),
    byModel: byDimension(
      (l) => l.model_interested,
      (l) => l.model_interested,
    ),
    timeBuckets: TIME_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      count: days.filter((d) => d >= b.min && d <= b.max).length,
    })),
  };
}
