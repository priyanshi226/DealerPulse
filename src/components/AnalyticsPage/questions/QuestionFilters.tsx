import type { QuestionFilterState } from '../../../analytics/questions/filters';
import type { FilterKey, QuestionFilterOptionSet } from '../../../analytics/questions/types';
import { MultiSelectFilter } from '../../DataExplorer/MultiSelectFilter';

interface QuestionFiltersProps {
  supported: FilterKey[];
  filters: QuestionFilterState;
  options: QuestionFilterOptionSet;
  onChange: (filters: QuestionFilterState) => void;
}

/** Renders only the filter controls a given question declares as
 * `supportedFilters` — one reusable row bound to the page's shared filter
 * state, so no question re-implements its own filtering. */
export function QuestionFilters({ supported, filters, options, onChange }: QuestionFiltersProps) {
  function set<K extends keyof QuestionFilterState>(key: K, value: QuestionFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="q-filters">
      {supported.includes('branch') && (
        <MultiSelectFilter
          label="Branch"
          options={options.branches.map((b) => ({ value: b.id, label: b.label }))}
          selected={filters.branchIds}
          onChange={(v) => set('branchIds', v)}
        />
      )}
      {supported.includes('salesRep') && (
        <MultiSelectFilter
          label="Sales Rep"
          options={options.reps.map((r) => ({ value: r.id, label: r.label }))}
          selected={filters.repIds}
          onChange={(v) => set('repIds', v)}
        />
      )}
      {supported.includes('source') && (
        <MultiSelectFilter
          label="Source"
          options={options.sources.map((s) => ({ value: s.value, label: s.label }))}
          selected={filters.sources}
          onChange={(v) => set('sources', v as QuestionFilterState['sources'])}
        />
      )}
      {supported.includes('model') && (
        <MultiSelectFilter
          label="Model"
          options={options.models.map((m) => ({ value: m, label: m }))}
          selected={filters.models}
          onChange={(v) => set('models', v)}
        />
      )}
      {supported.includes('status') && (
        <MultiSelectFilter
          label="Status"
          options={options.statuses.map((s) => ({ value: s.value, label: s.label }))}
          selected={filters.statuses}
          onChange={(v) => set('statuses', v as QuestionFilterState['statuses'])}
        />
      )}
      {supported.includes('lostReason') && (
        <MultiSelectFilter
          label="Lost Reason"
          options={options.lostReasons.map((r) => ({ value: r, label: r }))}
          selected={filters.lostReasons}
          onChange={(v) => set('lostReasons', v)}
        />
      )}
      {supported.includes('activeClosed') && (
        <select
          className="q-filters__select"
          value={filters.activeClosed}
          onChange={(e) => set('activeClosed', e.target.value as QuestionFilterState['activeClosed'])}
          aria-label="Active or closed"
        >
          <option value="all">Active + Closed</option>
          <option value="active">Active only</option>
          <option value="closed">Closed only</option>
        </select>
      )}
      {supported.includes('deliveryStatus') && (
        <select
          className="q-filters__select"
          value={filters.deliveryStatus}
          onChange={(e) => set('deliveryStatus', e.target.value as QuestionFilterState['deliveryStatus'])}
          aria-label="Delivery status"
        >
          <option value="all">Delivered + Not delivered</option>
          <option value="delivered">Delivered only</option>
          <option value="not_delivered">Not delivered</option>
        </select>
      )}
      {supported.includes('dealValueRange') && (
        <div className="q-filters__range">
          <input
            type="number"
            placeholder="Min ₹"
            aria-label="Minimum deal value"
            value={filters.dealValueMin ?? ''}
            onChange={(e) => set('dealValueMin', e.target.value === '' ? null : Number(e.target.value))}
          />
          <span>–</span>
          <input
            type="number"
            placeholder="Max ₹"
            aria-label="Maximum deal value"
            value={filters.dealValueMax ?? ''}
            onChange={(e) => set('dealValueMax', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      )}
      {supported.includes('dateRange') && (
        <div className="date-range date-range--compact">
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
      )}
      {supported.includes('expectedCloseRange') && (
        <div className="date-range date-range--compact">
          <input
            type="date"
            aria-label="Expected close from"
            value={filters.expectedCloseFrom ?? ''}
            onChange={(e) => set('expectedCloseFrom', e.target.value || null)}
          />
          <span className="date-range__sep">–</span>
          <input
            type="date"
            aria-label="Expected close to"
            value={filters.expectedCloseTo ?? ''}
            onChange={(e) => set('expectedCloseTo', e.target.value || null)}
          />
        </div>
      )}
    </div>
  );
}
