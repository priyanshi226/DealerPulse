import { MultiSelectFilter } from '../DataExplorer/MultiSelectFilter';
import { EMPTY_ANALYTICS_FILTERS, hasActiveAnalyticsFilters } from '../../analytics/types';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../analytics/types';

interface GlobalFilterBarProps {
  filters: AnalyticsFilterState;
  options: AnalyticsFilterOptions;
  onChange: (filters: AnalyticsFilterState) => void;
}

/** The one filter bar that scopes every chart on the Analytics page — see
 * analytics/filters.ts for the corresponding central filtering logic. */
export function GlobalFilterBar({ filters, options, onChange }: GlobalFilterBarProps) {
  function set<K extends keyof AnalyticsFilterState>(key: K, value: AnalyticsFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  const chips = buildChips(filters, options, onChange);

  return (
    <div className="filter-bar">
      <div className="filter-bar__row">
        <MultiSelectFilter
          label="Branch"
          options={options.branches.map((b) => ({ value: b.id, label: b.label }))}
          selected={filters.branchIds}
          onChange={(v) => set('branchIds', v)}
        />
        <MultiSelectFilter
          label="Sales Rep"
          options={options.reps.map((r) => ({ value: r.id, label: r.label }))}
          selected={filters.repIds}
          onChange={(v) => set('repIds', v)}
        />
        <MultiSelectFilter
          label="Source"
          options={options.sources.map((s) => ({ value: s.value, label: s.label }))}
          selected={filters.sources}
          onChange={(v) => set('sources', v as AnalyticsFilterState['sources'])}
        />
        <MultiSelectFilter
          label="Model"
          options={options.models.map((m) => ({ value: m, label: m }))}
          selected={filters.models}
          onChange={(v) => set('models', v)}
        />
        <MultiSelectFilter
          label="Status"
          options={options.statuses.map((s) => ({ value: s.value, label: s.label }))}
          selected={filters.statuses}
          onChange={(v) => set('statuses', v as AnalyticsFilterState['statuses'])}
        />

        <div className="date-range">
          <input
            type="date"
            aria-label="From date"
            value={filters.dateFrom ?? ''}
            min={options.dateBounds?.min}
            max={options.dateBounds?.max}
            onChange={(e) => set('dateFrom', e.target.value || null)}
          />
          <span className="date-range__sep">–</span>
          <input
            type="date"
            aria-label="To date"
            value={filters.dateTo ?? ''}
            min={options.dateBounds?.min}
            max={options.dateBounds?.max}
            onChange={(e) => set('dateTo', e.target.value || null)}
          />
        </div>

        <button
          type="button"
          className="clear-filters"
          disabled={!hasActiveAnalyticsFilters(filters)}
          onClick={() => onChange(EMPTY_ANALYTICS_FILTERS)}
        >
          Reset
        </button>
      </div>

      {chips.length > 0 && (
        <div className="filter-chips">
          {chips.map((chip) => (
            <button key={chip.id} type="button" className="filter-chip" onClick={chip.onRemove}>
              <span className="filter-chip__label">{chip.label}</span>
              <span className="filter-chip__remove" aria-hidden>
                ×
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Chip {
  id: string;
  label: string;
  onRemove: () => void;
}

function buildChips(
  filters: AnalyticsFilterState,
  options: AnalyticsFilterOptions,
  onChange: (filters: AnalyticsFilterState) => void,
): Chip[] {
  const chips: Chip[] = [];

  const branchLabel = new Map(options.branches.map((b) => [b.id, b.label]));
  filters.branchIds.forEach((id) =>
    chips.push({
      id: `branch-${id}`,
      label: branchLabel.get(id) ?? id,
      onRemove: () => onChange({ ...filters, branchIds: filters.branchIds.filter((v) => v !== id) }),
    }),
  );

  const repLabel = new Map(options.reps.map((r) => [r.id, r.label]));
  filters.repIds.forEach((id) =>
    chips.push({
      id: `rep-${id}`,
      label: repLabel.get(id) ?? id,
      onRemove: () => onChange({ ...filters, repIds: filters.repIds.filter((v) => v !== id) }),
    }),
  );

  const sourceLabel = new Map(options.sources.map((s) => [s.value, s.label]));
  filters.sources.forEach((s) =>
    chips.push({
      id: `source-${s}`,
      label: sourceLabel.get(s) ?? s,
      onRemove: () => onChange({ ...filters, sources: filters.sources.filter((v) => v !== s) }),
    }),
  );

  filters.models.forEach((m) =>
    chips.push({
      id: `model-${m}`,
      label: m,
      onRemove: () => onChange({ ...filters, models: filters.models.filter((v) => v !== m) }),
    }),
  );

  const statusLabel = new Map(options.statuses.map((s) => [s.value, s.label]));
  filters.statuses.forEach((s) =>
    chips.push({
      id: `status-${s}`,
      label: statusLabel.get(s) ?? s,
      onRemove: () => onChange({ ...filters, statuses: filters.statuses.filter((v) => v !== s) }),
    }),
  );

  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      id: 'date-range',
      label: `${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}`,
      onRemove: () => onChange({ ...filters, dateFrom: null, dateTo: null }),
    });
  }

  return chips;
}
