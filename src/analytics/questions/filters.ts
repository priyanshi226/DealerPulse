// The Questions page's own filter layer — a superset of the Charts filter
// dimensions (see analytics/filters.ts), because individual questions call
// for a few extra slices (lost reason, deal value range, active/closed,
// delivered vs not, expected-close range) that the chart breakdowns don't
// need. Kept as a separate, independent filter state from Charts mode (the
// two Analytics sub-views are independent slicing sessions).

import { SOURCE_LABELS, STATUS_LABELS, STATUS_ORDER } from '../../data/transformations';
import type { DealershipDataset, EnrichedLead, LeadSource, LeadStatus } from '../../data/types';
import type { DateField, FilterKey, QuestionFilterOptionSet } from './types';

export interface QuestionFilterState {
  branchIds: string[];
  repIds: string[];
  sources: LeadSource[];
  models: string[];
  statuses: LeadStatus[];
  dateFrom: string | null;
  dateTo: string | null;
  lostReasons: string[];
  dealValueMin: number | null;
  dealValueMax: number | null;
  activeClosed: 'all' | 'active' | 'closed';
  deliveryStatus: 'all' | 'delivered' | 'not_delivered';
  expectedCloseFrom: string | null;
  expectedCloseTo: string | null;
}

export const EMPTY_QUESTION_FILTERS: QuestionFilterState = {
  branchIds: [],
  repIds: [],
  sources: [],
  models: [],
  statuses: [],
  dateFrom: null,
  dateTo: null,
  lostReasons: [],
  dealValueMin: null,
  dealValueMax: null,
  activeClosed: 'all',
  deliveryStatus: 'all',
  expectedCloseFrom: null,
  expectedCloseTo: null,
};

/**
 * Enforces the branch → sales rep dependency: once a rep is no longer valid
 * for the currently selected branch(es), drop it rather than leaving a
 * contradictory selection sitting in state (e.g. a Downtown Toyota rep still
 * "selected" after the branch filter changes to Mumbai Toyota). Called on
 * every filter change for one question card — never touches other cards'
 * state, since each card owns its own `QuestionFilterState`.
 */
export function sanitizeQuestionFilters(filters: QuestionFilterState, raw: DealershipDataset): QuestionFilterState {
  if (filters.branchIds.length === 0 || filters.repIds.length === 0) return filters;

  const validRepIds = new Set(raw.sales_reps.filter((r) => filters.branchIds.includes(r.branch_id)).map((r) => r.id));
  const prunedRepIds = filters.repIds.filter((id) => validRepIds.has(id));
  if (prunedRepIds.length === filters.repIds.length) return filters;

  return { ...filters, repIds: prunedRepIds };
}

export function hasActiveQuestionFilters(filters: QuestionFilterState): boolean {
  return (
    filters.branchIds.length > 0 ||
    filters.repIds.length > 0 ||
    filters.sources.length > 0 ||
    filters.models.length > 0 ||
    filters.statuses.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.lostReasons.length > 0 ||
    filters.dealValueMin !== null ||
    filters.dealValueMax !== null ||
    filters.activeClosed !== 'all' ||
    filters.deliveryStatus !== 'all' ||
    filters.expectedCloseFrom !== null ||
    filters.expectedCloseTo !== null
  );
}

/**
 * Filters leads for one question, honoring only the filter keys that
 * question actually declares as supported — an active filter the question
 * doesn't support is simply not applied to it (each question answers within
 * the slice it understands, per its own `supportedFilters`).
 *
 * `dateField` picks which date the date-range filter is checked against:
 * 'created_at' (lead acquisition — the default for most questions) or
 * 'delivery_date' (revenue/delivery questions), matching the same
 * per-question date semantics used in Charts mode.
 */
export function filterLeadsForQuestion(
  leads: EnrichedLead[],
  deliveryDateByLeadId: Map<string, string>,
  filters: QuestionFilterState,
  supported: FilterKey[],
  dateField: DateField,
): EnrichedLead[] {
  const supports = (key: FilterKey) => supported.includes(key);

  const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
  const closeFrom = filters.expectedCloseFrom ? new Date(filters.expectedCloseFrom).getTime() : null;
  const closeTo = filters.expectedCloseTo ? new Date(filters.expectedCloseTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

  return leads.filter((lead) => {
    if (supports('branch') && filters.branchIds.length && !filters.branchIds.includes(lead.branch_id)) return false;
    if (supports('salesRep') && filters.repIds.length && !filters.repIds.includes(lead.assigned_to)) return false;
    if (supports('source') && filters.sources.length && !filters.sources.includes(lead.source)) return false;
    if (supports('model') && filters.models.length && !filters.models.includes(lead.model_interested)) return false;
    if (supports('status') && filters.statuses.length && !filters.statuses.includes(lead.status)) return false;

    if (supports('lostReason') && filters.lostReasons.length) {
      if (!lead.lost_reason || !filters.lostReasons.includes(lead.lost_reason)) return false;
    }

    if (supports('dealValueRange')) {
      if (filters.dealValueMin !== null && lead.deal_value < filters.dealValueMin) return false;
      if (filters.dealValueMax !== null && lead.deal_value > filters.dealValueMax) return false;
    }

    if (supports('activeClosed') && filters.activeClosed !== 'all') {
      const isClosed = lead.status === 'delivered' || lead.status === 'lost';
      if (filters.activeClosed === 'active' && isClosed) return false;
      if (filters.activeClosed === 'closed' && !isClosed) return false;
    }

    if (supports('deliveryStatus') && filters.deliveryStatus !== 'all') {
      const delivered = deliveryDateByLeadId.has(lead.id);
      if (filters.deliveryStatus === 'delivered' && !delivered) return false;
      if (filters.deliveryStatus === 'not_delivered' && delivered) return false;
    }

    if (supports('expectedCloseRange') && (closeFrom !== null || closeTo !== null)) {
      const closeAt = new Date(lead.expected_close_date).getTime();
      if (closeFrom !== null && closeAt < closeFrom) return false;
      if (closeTo !== null && closeAt > closeTo) return false;
    }

    if (supports('dateRange') && (from !== null || to !== null)) {
      const dateValue =
        dateField === 'delivery_date' ? deliveryDateByLeadId.get(lead.id) ?? null : lead.created_at;
      if (dateValue === null) return false; // no delivery date to compare against — excluded from a delivery-dated range
      const t = new Date(dateValue).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
    }

    return true;
  });
}

export function deriveQuestionFilterOptions(raw: DealershipDataset, filters: QuestionFilterState): QuestionFilterOptionSet {
  const branches = raw.branches.map((b) => ({ id: b.id, label: `${b.id} — ${b.name}` }));

  const repsInScope = filters.branchIds.length
    ? raw.sales_reps.filter((r) => filters.branchIds.includes(r.branch_id))
    : raw.sales_reps;
  const reps = repsInScope
    .map((r) => ({ id: r.id, label: `${r.id} — ${r.name}`, branchId: r.branch_id }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const sourcesPresent = Array.from(new Set(raw.leads.map((l) => l.source)));
  const sources = sourcesPresent
    .map((s) => ({ value: s, label: SOURCE_LABELS[s] ?? s }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const models = Array.from(new Set(raw.leads.map((l) => l.model_interested))).sort();

  const statusesPresent = new Set(raw.leads.map((l) => l.status));
  const statuses = STATUS_ORDER.filter((s) => statusesPresent.has(s)).map((s) => ({ value: s, label: STATUS_LABELS[s] }));

  const lostReasons = Array.from(new Set(raw.leads.filter((l) => l.lost_reason).map((l) => l.lost_reason as string))).sort();

  const dates = raw.leads.map((l) => l.created_at).sort();
  const dateBounds = dates.length ? { min: dates[0].slice(0, 10), max: dates[dates.length - 1].slice(0, 10) } : null;

  return { branches, reps, sources, models, statuses, lostReasons, dateBounds };
}
