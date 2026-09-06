// Types for the Analytics page's filter/calculation layer. These build on top
// of the core dataset types in `src/data/types.ts` — nothing here redefines
// the dataset shape, it only adds the filter/result shapes specific to
// analytics (the Table page's own filter state in `data/transformations.ts`
// is intentionally separate and untouched).

import type { LeadSource, LeadStatus } from '../data/types';

export interface AnalyticsFilterState {
  branchIds: string[];
  repIds: string[];
  sources: LeadSource[];
  models: string[];
  statuses: LeadStatus[];
  dateFrom: string | null;
  dateTo: string | null;
}

export const EMPTY_ANALYTICS_FILTERS: AnalyticsFilterState = {
  branchIds: [],
  repIds: [],
  sources: [],
  models: [],
  statuses: [],
  dateFrom: null,
  dateTo: null,
};

export function hasActiveAnalyticsFilters(filters: AnalyticsFilterState): boolean {
  return (
    filters.branchIds.length > 0 ||
    filters.repIds.length > 0 ||
    filters.sources.length > 0 ||
    filters.models.length > 0 ||
    filters.statuses.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
}

export interface AnalyticsFilterOptions {
  branches: { id: string; label: string }[];
  reps: { id: string; label: string; branchId: string }[];
  sources: { value: LeadSource; label: string }[];
  models: string[];
  statuses: { value: LeadStatus; label: string }[];
  dateBounds: { min: string; max: string } | null;
}

/** Which entity a "break down by" / "performance" control is currently sliced by. */
export type PerformanceDimension = 'branch' | 'rep' | 'source' | 'model';

/** Which measure a reusable breakdown chart currently renders. */
export type BreakdownMetric = 'leads' | 'delivered' | 'revenue' | 'conversion' | 'pipeline' | 'targetAchievement';
