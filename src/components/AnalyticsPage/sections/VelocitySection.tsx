import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { VelocityStageRow } from '../../../analytics/calculations';
import { formatDays } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { BarChart, type BarChartRow } from '../charts/BarChart';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { SectionCard } from '../charts/SectionCard';

interface VelocitySectionProps {
  stages: VelocityStageRow[];
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function VelocitySection({ stages, filters, filterOptions }: VelocitySectionProps) {
  const rows: BarChartRow[] = stages
    .filter((s) => s.medianDays !== null)
    .map((s) => ({
      key: s.key,
      label: s.label,
      sublabel: `${s.sampleSize} lead${s.sampleSize === 1 ? '' : 's'}`,
      value: s.medianDays as number,
      displayValue: formatDays(s.medianDays as number),
    }));

  const info: ChartInfo = {
    title: 'Sales Velocity',
    chartType: 'Horizontal bar chart',
    description: "Median days spent between consecutive stages, using each lead's own status_history timestamps.",
    formula: FORMULA.stageDuration,
    dataGrain: GRAIN.statusHistory,
    dateSemantics: DATE_SEMANTICS.statusHistory,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'status', 'dateRange'],
    values: rows.map((r) => ({ label: r.label, value: r.displayValue })),
    caveat: 'A horizontal bar is used because the question is comparing durations between stages, not a single total.',
  };

  return (
    <SectionCard
      title="Sales Velocity"
      description="Median days spent between consecutive stages, from each lead's own status history."
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <BarChart rows={rows} emptyMessage="No stage-to-stage timing data for the selected filters." />
    </SectionCard>
  );
}
