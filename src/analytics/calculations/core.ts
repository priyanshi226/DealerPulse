// Shared, deterministic helpers used across the calculation layer. No
// hardcoded business numbers live here — only generic statistics and the few
// explicitly-documented thresholds the spec calls for.

import type { EnrichedLead, LeadStatus } from '../../data/types';

/** Statuses that still represent open, in-progress business (not won, not lost). */
export const ACTIVE_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'test_drive',
  'negotiation',
  'order_placed',
];

export function isActive(lead: EnrichedLead): boolean {
  return lead.status !== 'delivered' && lead.status !== 'lost';
}

/**
 * A lead counts as "stale" once it's gone this many days without activity.
 * Documented, fixed threshold (not invented per-view) — chosen to line up
 * with the Lead Aging bucket boundary at 15 days, so "stale" always means
 * the same thing everywhere it's used (rep/branch performance + aging).
 */
export const STALE_THRESHOLD_DAYS = 15;

/**
 * Minimum number of leads a rep/branch/source/model must have before its
 * conversion rate is treated as a meaningful signal in the UI (still shown,
 * just flagged) — guards against declaring a 1-lead 100% conversion "best".
 */
export const MIN_SAMPLE_SIZE = 5;

export function daysBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

export function sumBy<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((total, item) => total + fn(item), 0);
}

/** "2025-08-01T..." -> "2025-08" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/** Safe percentage: null when the denominator is zero (never fabricate 0%). */
export function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}
