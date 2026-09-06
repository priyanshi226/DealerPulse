import type { Delivery, EnrichedLead } from '../../data/types';
import { groupBy, monthKey, monthLabel, pct, sumBy } from './core';

export type TrendMetric = 'leads' | 'delivered' | 'revenue' | 'conversion';

export interface TrendPoint {
  month: string;
  label: string;
  value: number | null;
  /** Only meaningful for 'conversion' — false means this cohort hasn't had
   * enough time to finish converting, so its rate would understate the truth. */
  isMature?: boolean;
}

/**
 * Longest observed lead-to-delivery cycle in this dataset is ~63 days, so a
 * creation-month cohort younger than this hasn't had a fair chance to convert
 * yet — its conversion% is still provisional (spec: don't present an
 * immature-cohort conversion rate as if it were final).
 */
const COHORT_MATURITY_DAYS = 65;

function sortedMonths(keys: Iterable<string>): string[] {
  return Array.from(keys).sort();
}

export function calculateMonthlyTrend(
  filteredLeads: EnrichedLead[],
  deliveries: Delivery[],
  metric: TrendMetric,
  referenceNowIso: string,
): TrendPoint[] {
  const deliveryByLeadId = new Map(deliveries.map((d) => [d.lead_id, d]));

  if (metric === 'leads') {
    const byMonth = groupBy(filteredLeads, (l) => monthKey(l.created_at));
    return sortedMonths(byMonth.keys()).map((month) => ({
      month,
      label: monthLabel(month),
      value: byMonth.get(month)!.length,
    }));
  }

  if (metric === 'delivered' || metric === 'revenue') {
    const delivered = filteredLeads.filter((l) => l.status === 'delivered' && deliveryByLeadId.has(l.id));
    const byMonth = groupBy(delivered, (l) => monthKey(deliveryByLeadId.get(l.id)!.delivery_date));
    return sortedMonths(byMonth.keys()).map((month) => {
      const leads = byMonth.get(month)!;
      return {
        month,
        label: monthLabel(month),
        value: metric === 'delivered' ? leads.length : sumBy(leads, (l) => l.deal_value),
      };
    });
  }

  // conversion: cohort by lead creation month
  const byMonth = groupBy(filteredLeads, (l) => monthKey(l.created_at));
  const referenceNow = new Date(referenceNowIso).getTime();
  return sortedMonths(byMonth.keys()).map((month) => {
    const cohort = byMonth.get(month)!;
    const delivered = cohort.filter((l) => l.status === 'delivered').length;
    const [year, mon] = month.split('-').map(Number);
    const monthEnd = new Date(year, mon, 0).getTime();
    const daysSinceMonthEnd = (referenceNow - monthEnd) / 86_400_000;
    return {
      month,
      label: monthLabel(month),
      value: pct(delivered, cohort.length),
      isMature: daysSinceMonthEnd >= COHORT_MATURITY_DAYS,
    };
  });
}
