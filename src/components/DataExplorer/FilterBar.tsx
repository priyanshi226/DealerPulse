import type { FilterOptions, FilterState } from '../../data/transformations';
import { EMPTY_FILTERS, hasActiveFilters } from '../../data/transformations';
import { MultiSelectFilter } from './MultiSelectFilter';

interface FilterBarProps {
  filters: FilterState;
  options: FilterOptions;
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, options, onChange }: FilterBarProps) {
  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  const chips = buildChips(filters, options, onChange);

  return (
    <div className="filter-bar">
      <div className="filter-bar__row">
        <div className="search-input">
          <span className="search-input__icon" aria-hidden>
            ⌕
          </span>
          <input
            type="text"
            placeholder="Search customer, lead ID, rep, model…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
          />
          {filters.search && (
            <button
              type="button"
              className="search-input__clear"
              onClick={() => set('search', '')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <MultiSelectFilter
          label="Branch"
          options={options.branches.map((b) => ({ value: b.id, label: b.label }))}
          selected={filters.branchIds}
          onChange={(v) => set('branchIds', v)}
        />
        <MultiSelectFilter
          label="Status"
          options={options.statuses.map((s) => ({ value: s.value, label: s.label }))}
          selected={filters.statuses}
          onChange={(v) => set('statuses', v as FilterState['statuses'])}
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
          onChange={(v) => set('sources', v as FilterState['sources'])}
        />
        <MultiSelectFilter
          label="Model"
          options={options.models.map((m) => ({ value: m, label: m }))}
          selected={filters.models}
          onChange={(v) => set('models', v)}
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
          disabled={!hasActiveFilters(filters)}
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Clear filters
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
  filters: FilterState,
  options: FilterOptions,
  onChange: (filters: FilterState) => void,
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

  const statusLabel = new Map(options.statuses.map((s) => [s.value, s.label]));
  filters.statuses.forEach((s) =>
    chips.push({
      id: `status-${s}`,
      label: statusLabel.get(s) ?? s,
      onRemove: () => onChange({ ...filters, statuses: filters.statuses.filter((v) => v !== s) }),
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

  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      id: 'date-range',
      label: `${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}`,
      onRemove: () => onChange({ ...filters, dateFrom: null, dateTo: null }),
    });
  }

  return chips;
}
