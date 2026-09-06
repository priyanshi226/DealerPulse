import type { DealershipDataset, EnrichedLead, LeadSource, LeadStatus } from './types';

// ---------------------------------------------------------------------------
// View modes
// ---------------------------------------------------------------------------

export type ViewMode = 'all' | 'branch' | 'status' | 'salesRep' | 'source' | 'model';

export const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'all', label: 'All Leads' },
  { mode: 'branch', label: 'Branch' },
  { mode: 'status', label: 'Status' },
  { mode: 'salesRep', label: 'Sales Rep' },
  { mode: 'source', label: 'Source' },
  { mode: 'model', label: 'Model' },
];

// Canonical pipeline order — this is a display concern (not alphabetical),
// so status grouping/sorting always reads like a funnel.
export const STATUS_ORDER: LeadStatus[] = [
  'new',
  'contacted',
  'test_drive',
  'negotiation',
  'order_placed',
  'delivered',
  'lost',
];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  test_drive: 'Test Drive',
  negotiation: 'Negotiation',
  order_placed: 'Order Placed',
  delivered: 'Delivered',
  lost: 'Lost',
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  walk_in: 'Walk-in',
  referral: 'Referral',
  phone_enquiry: 'Phone Enquiry',
  social_media: 'Social Media',
  auto_expo: 'Auto Expo',
};

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface FilterState {
  branchIds: string[];
  statuses: LeadStatus[];
  repIds: string[];
  sources: LeadSource[];
  models: string[];
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
}

export const EMPTY_FILTERS: FilterState = {
  branchIds: [],
  statuses: [],
  repIds: [],
  sources: [],
  models: [],
  dateFrom: null,
  dateTo: null,
  search: '',
};

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.branchIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.repIds.length > 0 ||
    filters.sources.length > 0 ||
    filters.models.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.search.trim() !== ''
  );
}

export function applyFilters(leads: EnrichedLead[], filters: FilterState): EnrichedLead[] {
  const search = filters.search.trim().toLowerCase();
  const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  // End-of-day so the "to" date is inclusive.
  const to = filters.dateTo ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

  return leads.filter((lead) => {
    if (filters.branchIds.length && !filters.branchIds.includes(lead.branch_id)) return false;
    if (filters.statuses.length && !filters.statuses.includes(lead.status)) return false;
    if (filters.repIds.length && !filters.repIds.includes(lead.assigned_to)) return false;
    if (filters.sources.length && !filters.sources.includes(lead.source)) return false;
    if (filters.models.length && !filters.models.includes(lead.model_interested)) return false;

    if (from !== null || to !== null) {
      const createdAt = new Date(lead.created_at).getTime();
      if (from !== null && createdAt < from) return false;
      if (to !== null && createdAt > to) return false;
    }

    if (search) {
      const haystack = [
        lead.id,
        lead.customer_name,
        lead.repName,
        lead.branchName,
        lead.model_interested,
        lead.source,
        lead.status,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export type SortField =
  | 'created_at'
  | 'last_activity_at'
  | 'expected_close_date'
  | 'deal_value'
  | 'status'
  | 'branchName'
  | 'repName';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  dir: SortDir;
}

export const DEFAULT_SORT: SortState = { field: 'last_activity_at', dir: 'desc' };

export function sortLeads(leads: EnrichedLead[], sort: SortState): EnrichedLead[] {
  const sorted = [...leads];
  const dirMultiplier = sort.dir === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sort.field) {
      case 'created_at':
      case 'last_activity_at':
        cmp = new Date(a[sort.field]).getTime() - new Date(b[sort.field]).getTime();
        break;
      case 'expected_close_date':
        cmp = new Date(a.expected_close_date).getTime() - new Date(b.expected_close_date).getTime();
        break;
      case 'deal_value':
        cmp = a.deal_value - b.deal_value;
        break;
      case 'status':
        cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        break;
      case 'branchName':
        cmp = a.branchName.localeCompare(b.branchName);
        break;
      case 'repName':
        cmp = a.repName.localeCompare(b.repName);
        break;
    }
    return cmp * dirMultiplier;
  });

  return sorted;
}

// ---------------------------------------------------------------------------
// Grouping (drives Branch / Status / Sales Rep / Source / Model views)
// ---------------------------------------------------------------------------

export interface LeadGroup {
  key: string;
  label: string;
  sublabel?: string;
  /** Branch id backing this group, when known — used to keep branch colors
   * consistent across the Branch and Sales Rep views. */
  branchId?: string;
  leads: EnrichedLead[];
}

export function groupLeads(
  leads: EnrichedLead[],
  viewMode: ViewMode,
  raw: DealershipDataset,
): LeadGroup[] {
  if (viewMode === 'all') {
    return [{ key: 'all', label: 'All Leads', leads }];
  }

  if (viewMode === 'branch') {
    // Preserve the branch order as it appears in the source dataset.
    return raw.branches
      .map((branch) => ({
        key: branch.id,
        label: `${branch.id} — ${branch.name}`,
        sublabel: branch.city,
        branchId: branch.id,
        leads: leads.filter((l) => l.branch_id === branch.id),
      }))
      .filter((g) => g.leads.length > 0);
  }

  if (viewMode === 'status') {
    return STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      leads: leads.filter((l) => l.status === status),
    })).filter((g) => g.leads.length > 0);
  }

  if (viewMode === 'salesRep') {
    const repById = new Map(raw.sales_reps.map((r) => [r.id, r]));
    const branchById = new Map(raw.branches.map((b) => [b.id, b]));
    const repIds = Array.from(new Set(leads.map((l) => l.assigned_to)));

    return repIds
      .map((repId) => {
        const rep = repById.get(repId);
        const branch = rep ? branchById.get(rep.branch_id) : undefined;
        return {
          key: repId,
          label: rep ? `${rep.id} — ${rep.name}` : repId,
          sublabel: branch ? `${branch.id} — ${branch.name}` : undefined,
          branchId: branch?.id,
          leads: leads.filter((l) => l.assigned_to === repId),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label))
      .filter((g) => g.leads.length > 0);
  }

  if (viewMode === 'source') {
    const sources = Array.from(new Set(leads.map((l) => l.source)));
    return sources
      .map((source) => ({
        key: source,
        label: SOURCE_LABELS[source] ?? source,
        leads: leads.filter((l) => l.source === source),
      }))
      .sort((a, b) => b.leads.length - a.leads.length)
      .filter((g) => g.leads.length > 0);
  }

  // model
  const models = Array.from(new Set(leads.map((l) => l.model_interested)));
  return models
    .map((model) => ({
      key: model,
      label: model,
      leads: leads.filter((l) => l.model_interested === model),
    }))
    .sort((a, b) => b.leads.length - a.leads.length)
    .filter((g) => g.leads.length > 0);
}

// ---------------------------------------------------------------------------
// Filter option derivation — always computed from the dataset, never hardcoded.
// ---------------------------------------------------------------------------

export interface FilterOptions {
  branches: { id: string; label: string }[];
  statuses: { value: LeadStatus; label: string }[];
  reps: { id: string; label: string }[];
  sources: { value: LeadSource; label: string }[];
  models: string[];
  dateBounds: { min: string; max: string } | null;
}

export function deriveFilterOptions(raw: DealershipDataset, leads: EnrichedLead[]): FilterOptions {
  const branches = raw.branches.map((b) => ({ id: b.id, label: `${b.id} — ${b.name}` }));

  const statusesPresent = new Set(leads.map((l) => l.status));
  const statuses = STATUS_ORDER.filter((s) => statusesPresent.has(s)).map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
  }));

  const repById = new Map(raw.sales_reps.map((r) => [r.id, r]));
  const repIdsPresent = Array.from(new Set(leads.map((l) => l.assigned_to)));
  const reps = repIdsPresent
    .map((id) => {
      const rep = repById.get(id);
      return { id, label: rep ? `${rep.id} — ${rep.name}` : id };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const sourcesPresent = Array.from(new Set(leads.map((l) => l.source)));
  const sources = sourcesPresent
    .map((s) => ({ value: s, label: SOURCE_LABELS[s] ?? s }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const models = Array.from(new Set(leads.map((l) => l.model_interested))).sort();

  const dates = leads.map((l) => l.created_at).sort();
  const dateBounds = dates.length
    ? { min: dates[0].slice(0, 10), max: dates[dates.length - 1].slice(0, 10) }
    : null;

  return { branches, statuses, reps, sources, models, dateBounds };
}
