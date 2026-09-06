import type { EnrichedLead } from '../../data/types';
import { daysBetween, isActive, sumBy } from './core';

const AGING_BUCKETS = [
  { key: '0-2', label: '0–2 days', min: 0, max: 2 },
  { key: '3-7', label: '3–7 days', min: 3, max: 7 },
  { key: '8-14', label: '8–14 days', min: 8, max: 14 },
  { key: '15-30', label: '15–30 days', min: 15, max: 30 },
  { key: '30+', label: '30+ days', min: 31, max: Infinity },
];

export interface AgingBucketRow {
  key: string;
  label: string;
  count: number;
  value: number;
}

/** How long ACTIVE leads (not delivered/lost) have gone without activity,
 * anchored to the dataset's own reference "now" (its latest recorded activity). */
export function calculateLeadAging(filteredLeads: EnrichedLead[], referenceNowIso: string): AgingBucketRow[] {
  const active = filteredLeads.filter(isActive);
  return AGING_BUCKETS.map((bucket) => {
    const leads = active.filter((l) => {
      const days = daysBetween(l.last_activity_at, referenceNowIso);
      return days >= bucket.min && days <= bucket.max;
    });
    return { key: bucket.key, label: bucket.label, count: leads.length, value: sumBy(leads, (l) => l.deal_value) };
  });
}
