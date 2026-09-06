import { useState } from 'react';
import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { ExpectedCloseBucketRow } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { BarChart, type BarChartRow } from '../charts/BarChart';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';

type Metric = 'count' | 'value';

interface ExpectedCloseSectionProps {
  buckets: ExpectedCloseBucketRow[];
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function ExpectedCloseSection({ buckets, filters, filterOptions }: ExpectedCloseSectionProps) {
  const [metric, setMetric] = useState<Metric>('count');

  const rows: BarChartRow[] = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    value: metric === 'count' ? b.count : b.value,
    displayValue: metric === 'count' ? b.count.toLocaleString('en-IN') : formatCompactCurrency(b.value),
    color: b.key === 'overdue' ? 'var(--status-lost)' : undefined,
  }));

  const info: ChartInfo = {
    title: 'Expected Close',
    chartType: 'Ordered bar chart',
    description: "Active leads bucketed by how their expected_close_date compares to today.",
    formula: FORMULA.overdue,
    dataGrain: GRAIN.lead,
    dateSemantics: DATE_SEMANTICS.expectedClose,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'dateRange'],
    values: rows.map((r) => ({ label: r.label, value: r.displayValue })),
  };

  return (
    <SectionCard
      title="Expected Close"
      description="Active leads by how their expected close date compares to today — overdue vs. upcoming."
      controls={
        <SegmentedControl
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'count', label: 'Count' },
            { value: 'value', label: 'Pipeline Value' },
          ]}
        />
      }
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <BarChart rows={rows} emptyMessage="No active leads for the selected filters." />
    </SectionCard>
  );
}
