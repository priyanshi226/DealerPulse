import type { EnrichedLead } from '../../data/types';
import { daysBetween, isActive, sumBy } from './core';

export interface ExpectedCloseBucketRow {
  key: string;
  label: string;
  count: number;
  value: number;
}

const BUCKETS: { key: string; label: string; test: (daysUntil: number) => boolean }[] = [
  { key: 'overdue', label: 'Overdue', test: (d) => d < 0 },
  { key: '0-7', label: 'Next 7 days', test: (d) => d >= 0 && d <= 7 },
  { key: '8-14', label: '8–14 days', test: (d) => d > 7 && d <= 14 },
  { key: '15-30', label: '15–30 days', test: (d) => d > 14 && d <= 30 },
  { key: '30+', label: '30+ days', test: (d) => d > 30 },
];

/** Where ACTIVE leads' expected_close_date sits relative to the dataset's
 * own reference "now" — overdue vs. upcoming, and the pipeline value at stake. */
export function calculateExpectedClose(filteredLeads: EnrichedLead[], referenceNowIso: string): ExpectedCloseBucketRow[] {
  const active = filteredLeads.filter(isActive);
  return BUCKETS.map((bucket) => {
    const leads = active.filter((l) => bucket.test(daysBetween(referenceNowIso, l.expected_close_date)));
    return { key: bucket.key, label: bucket.label, count: leads.length, value: sumBy(leads, (l) => l.deal_value) };
  });
}
