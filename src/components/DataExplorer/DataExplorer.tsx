import { useEffect, useMemo, useState } from 'react';
import { loadDealershipData, type NormalizedData } from '../../data/loadData';
import {
  DEFAULT_SORT,
  applyFilters,
  deriveFilterOptions,
  groupLeads,
  sortLeads,
  EMPTY_FILTERS,
  type FilterState,
  type SortField,
  type SortState,
  type ViewMode,
} from '../../data/transformations';
import { formatCurrency } from '../../data/format';
import type { EnrichedLead } from '../../data/types';
import { ViewBySelector } from './ViewBySelector';
import { FilterBar } from './FilterBar';
import { DataTable } from './DataTable';
import { BranchLegend, StatusLegend } from './Legend';
import { LeadJourneyModal } from './LeadJourneyModal';
import './DataExplorer.css';

export function DataExplorer() {
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDealershipData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const branchIndexById = useMemo(() => {
    if (!data) return new Map<string, number>();
    return new Map(data.raw.branches.map((b, i) => [b.id, i]));
  }, [data]);

  const filterOptions = useMemo(() => {
    if (!data) return null;
    return deriveFilterOptions(data.raw, data.leads);
  }, [data]);

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    return applyFilters(data.leads, filters);
  }, [data, filters]);

  const sortedLeads = useMemo(() => sortLeads(filteredLeads, sort), [filteredLeads, sort]);

  const groups = useMemo(() => {
    if (!data) return [];
    return groupLeads(sortedLeads, viewMode, data.raw);
  }, [data, sortedLeads, viewMode]);

  const referenceNowIso = useMemo(() => {
    if (!data || data.leads.length === 0) return new Date().toISOString();
    return data.leads.reduce((max, l) => (l.last_activity_at > max ? l.last_activity_at : max), data.leads[0].last_activity_at);
  }, [data]);

  function handleSortChange(field: SortField) {
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' },
    );
  }

  if (error) {
    return <div className="state-screen state-screen--error">Couldn't load dealership data: {error}</div>;
  }

  if (!data || !filterOptions) {
    return <div className="state-screen">Loading dealership data…</div>;
  }

  const totalValue = filteredLeads.reduce((sum, l) => sum + l.deal_value, 0);

  return (
    <div className="data-explorer">
      <div className="data-explorer__header">
        <div>
          <h1 className="data-explorer__title">Lead Data Explorer</h1>
          <p className="data-explorer__subtitle">
            {data.raw.branches.length} branches · {data.leads.length} leads · {data.raw.metadata.date_range}
          </p>
        </div>
        <div className="data-explorer__summary">
          <strong>{filteredLeads.length}</strong> of {data.leads.length} leads shown ·{' '}
          <strong>{formatCurrency(totalValue)}</strong> pipeline value
        </div>
      </div>

      <ViewBySelector value={viewMode} onChange={setViewMode} />

      <FilterBar filters={filters} options={filterOptions} onChange={setFilters} />

      {viewMode === 'branch' && <BranchLegend branches={data.raw.branches} />}
      {viewMode === 'status' && <StatusLegend />}

      <DataTable
        groups={groups}
        showGroupHeaders={viewMode !== 'all'}
        viewMode={viewMode}
        sort={sort}
        onSortChange={handleSortChange}
        branchIndexById={branchIndexById}
        referenceNowIso={referenceNowIso}
        onSelectLead={setSelectedLead}
      />

      {selectedLead && <LeadJourneyModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </div>
  );
}
