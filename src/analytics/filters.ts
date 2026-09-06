// The single, central filtering layer for the Analytics page.
//
// rawData -> filterLeads() -> filteredLeads -> calculations -> charts
//
// Every analytics calculation is derived from the SAME `filteredLeads` array
// (plus deliveries/targets joined off it), so there is no per-chart filter
// logic to drift out of sync — see analytics/calculations/*.

import type { DealershipDataset, Delivery, EnrichedLead } from '../data/types';
import { SOURCE_LABELS, STATUS_LABELS, STATUS_ORDER } from '../data/transformations';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from './types';

/**
 * The primary lead cohort for the whole Analytics page. Date range is applied
 * against `created_at` — i.e. "leads acquired in this period" — which is the
 * natural reading of a date filter over a lead dataset, and is what every
 * lead-grain section (KPIs, current pipeline, funnel, breakdowns, aging,
 * velocity, lost analysis) uses.
 *
 * Two sections deliberately do NOT use this cohort as-is because they operate
 * on a different date semantic:
 *  - Targets vs Actual joins against monthly target rows, so it re-derives its
 *    own lead set filtered by delivery month (see calculations/targets.ts).
 *  - Everything else that needs delivery-linked records (delivery analysis)
 *    joins deliveries onto THIS cohort via lead_id — see filterDeliveries().
 */
export function filterLeads(leads: EnrichedLead[], filters: AnalyticsFilterState): EnrichedLead[] {
  const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

  return leads.filter((lead) => {
    if (filters.branchIds.length && !filters.branchIds.includes(lead.branch_id)) return false;
    if (filters.repIds.length && !filters.repIds.includes(lead.assigned_to)) return false;
    if (filters.sources.length && !filters.sources.includes(lead.source)) return false;
    if (filters.models.length && !filters.models.includes(lead.model_interested)) return false;
    if (filters.statuses.length && !filters.statuses.includes(lead.status)) return false;

    if (from !== null || to !== null) {
      const createdAt = new Date(lead.created_at).getTime();
      if (from !== null && createdAt < from) return false;
      if (to !== null && createdAt > to) return false;
    }

    return true;
  });
}

/** Deliveries belonging to the filtered lead cohort, joined by lead_id. */
export function filterDeliveries(filteredLeads: EnrichedLead[], allDeliveries: Delivery[]): Delivery[] {
  const ids = new Set(filteredLeads.map((l) => l.id));
  return allDeliveries.filter((d) => ids.has(d.lead_id));
}

// ---------------------------------------------------------------------------
// Context-aware filter options — always derived from the dataset, and the
// rep list narrows to the selected branches (section 28's "intelligent
// filters" requirement).
// ---------------------------------------------------------------------------

export function deriveAnalyticsFilterOptions(
  raw: DealershipDataset,
  filters: AnalyticsFilterState,
): AnalyticsFilterOptions {
  const branches = raw.branches.map((b) => ({ id: b.id, label: `${b.id} — ${b.name}` }));

  const repsInScope =
    filters.branchIds.length > 0
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
  const statuses = STATUS_ORDER.filter((s) => statusesPresent.has(s)).map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
  }));

  const dates = raw.leads.map((l) => l.created_at).sort();
  const dateBounds = dates.length
    ? { min: dates[0].slice(0, 10), max: dates[dates.length - 1].slice(0, 10) }
    : null;

  return { branches, reps, sources, models, statuses, dateBounds };
}
