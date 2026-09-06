import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../types';
import type { ChartsFilterKey } from './types';

export interface FilterContextRow {
  key: string;
  label: string;
  value: string;
}

/** Renders only the filters a chart actually depends on ("relevantFilters"),
 * resolving ids to human labels — e.g. a revenue-by-branch chart shows
 * Branch/Rep/Source/Model/Date but never Status, since status doesn't scope
 * a delivered-only chart the same way. */
export function buildFilterContext(
  keys: ChartsFilterKey[],
  filters: AnalyticsFilterState,
  options: AnalyticsFilterOptions,
): FilterContextRow[] {
  const rows: FilterContextRow[] = [];

  if (keys.includes('branch')) {
    const branchLabel = new Map(options.branches.map((b) => [b.id, b.label]));
    rows.push({
      key: 'branch',
      label: 'Branch',
      value: filters.branchIds.length ? filters.branchIds.map((id) => branchLabel.get(id) ?? id).join(', ') : 'All',
    });
  }
  if (keys.includes('salesRep')) {
    const repLabel = new Map(options.reps.map((r) => [r.id, r.label]));
    rows.push({
      key: 'salesRep',
      label: 'Sales Rep',
      value: filters.repIds.length ? filters.repIds.map((id) => repLabel.get(id) ?? id).join(', ') : 'All',
    });
  }
  if (keys.includes('source')) {
    const sourceLabel = new Map(options.sources.map((s) => [s.value, s.label]));
    rows.push({
      key: 'source',
      label: 'Source',
      value: filters.sources.length ? filters.sources.map((s) => sourceLabel.get(s) ?? s).join(', ') : 'All',
    });
  }
  if (keys.includes('model')) {
    rows.push({ key: 'model', label: 'Model', value: filters.models.length ? filters.models.join(', ') : 'All' });
  }
  if (keys.includes('status')) {
    const statusLabel = new Map(options.statuses.map((s) => [s.value, s.label]));
    rows.push({
      key: 'status',
      label: 'Status',
      value: filters.statuses.length ? filters.statuses.map((s) => statusLabel.get(s) ?? s).join(', ') : 'All',
    });
  }
  if (keys.includes('dateRange')) {
    rows.push({
      key: 'dateRange',
      label: 'Date',
      value: filters.dateFrom || filters.dateTo ? `${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}` : 'All time',
    });
  }

  return rows;
}
