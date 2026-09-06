import { useState } from 'react';
import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { AgingBucketRow } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { BarChart, type BarChartRow } from '../charts/BarChart';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';

type Metric = 'count' | 'value';

interface AgingSectionProps {
  buckets: AgingBucketRow[];
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function AgingSection({ buckets, filters, filterOptions }: AgingSectionProps) {
  const [metric, setMetric] = useState<Metric>('count');

  const rows: BarChartRow[] = buckets.map((b) => ({
    key: b.key,
    label: b.label,
    value: metric === 'count' ? b.count : b.value,
    displayValue: metric === 'count' ? b.count.toLocaleString('en-IN') : formatCompactCurrency(b.value),
  }));

  const info: ChartInfo = {
    title: 'Lead Aging',
    chartType: 'Ordered bar chart',
    description: 'Active leads bucketed by how long since their last recorded activity.',
    formula: FORMULA.agingBucket,
    dataGrain: GRAIN.lead,
    dateSemantics: DATE_SEMANTICS.lastActivity,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'dateRange'],
    values: rows.map((r) => ({ label: r.label, value: r.displayValue })),
    caveat: 'Lead age here is days since last_activity_at, not created_at — a lead can be old but still recently touched.',
  };

  return (
    <SectionCard
      title="Lead Aging"
      description="How long active leads have gone without activity — how much pipeline is sitting untouched."
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
