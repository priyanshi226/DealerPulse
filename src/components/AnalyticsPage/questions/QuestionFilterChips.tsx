import { formatCurrency } from '../../../data/format';
import { EMPTY_QUESTION_FILTERS, hasActiveQuestionFilters } from '../../../analytics/questions/filters';
import type { QuestionFilterState } from '../../../analytics/questions/filters';
import type { QuestionFilterOptionSet } from '../../../analytics/questions/types';

interface QuestionFilterChipsProps {
  filters: QuestionFilterState;
  options: QuestionFilterOptionSet;
  onChange: (filters: QuestionFilterState) => void;
}

interface Chip {
  id: string;
  label: string;
  onRemove: () => void;
}

/** One question card's own filter summary + clear button — scoped entirely
 * to the `filters`/`onChange` this card was given, so removing a chip here
 * can never touch another card's state. Mirrors the chip look already used
 * by the Charts page's GlobalFilterBar, under a `q-` prefix so this stays
 * self-contained in QuestionsView.css rather than depending on another
 * page's stylesheet happening to already be loaded. */
export function QuestionFilterChips({ filters, options, onChange }: QuestionFilterChipsProps) {
  if (!hasActiveQuestionFilters(filters)) return null;

  const chips = buildChips(filters, options, onChange);

  return (
    <div className="q-filter-chips">
      {chips.map((chip) => (
        <button key={chip.id} type="button" className="q-filter-chip" onClick={chip.onRemove}>
          <span className="q-filter-chip__label">{chip.label}</span>
          <span className="q-filter-chip__remove" aria-hidden>
            ×
          </span>
        </button>
      ))}
      <button type="button" className="q-clear-filters" onClick={() => onChange(EMPTY_QUESTION_FILTERS)}>
        Clear filters
      </button>
    </div>
  );
}

function buildChips(filters: QuestionFilterState, options: QuestionFilterOptionSet, onChange: (filters: QuestionFilterState) => void): Chip[] {
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

  filters.lostReasons.forEach((r) =>
    chips.push({
      id: `lost-reason-${r}`,
      label: r,
      onRemove: () => onChange({ ...filters, lostReasons: filters.lostReasons.filter((v) => v !== r) }),
    }),
  );

  if (filters.activeClosed !== 'all') {
    chips.push({
      id: 'active-closed',
      label: filters.activeClosed === 'active' ? 'Active only' : 'Closed only',
      onRemove: () => onChange({ ...filters, activeClosed: 'all' }),
    });
  }

  if (filters.deliveryStatus !== 'all') {
    chips.push({
      id: 'delivery-status',
      label: filters.deliveryStatus === 'delivered' ? 'Delivered only' : 'Not delivered',
      onRemove: () => onChange({ ...filters, deliveryStatus: 'all' }),
    });
  }

  if (filters.dealValueMin !== null || filters.dealValueMax !== null) {
    const label =
      filters.dealValueMin !== null && filters.dealValueMax !== null
        ? `${formatCurrency(filters.dealValueMin)} – ${formatCurrency(filters.dealValueMax)}`
        : filters.dealValueMin !== null
          ? `≥ ${formatCurrency(filters.dealValueMin)}`
          : `≤ ${formatCurrency(filters.dealValueMax!)}`;
    chips.push({
      id: 'deal-value-range',
      label,
      onRemove: () => onChange({ ...filters, dealValueMin: null, dealValueMax: null }),
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      id: 'date-range',
      label: `${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}`,
      onRemove: () => onChange({ ...filters, dateFrom: null, dateTo: null }),
    });
  }

  if (filters.expectedCloseFrom || filters.expectedCloseTo) {
    chips.push({
      id: 'expected-close-range',
      label: `Close ${filters.expectedCloseFrom ?? '…'} → ${filters.expectedCloseTo ?? '…'}`,
      onRemove: () => onChange({ ...filters, expectedCloseFrom: null, expectedCloseTo: null }),
    });
  }

  return chips;
}
