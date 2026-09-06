import { useState } from 'react';
import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { LossAnalysisResult } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { BarChart, type BarChartRow } from '../charts/BarChart';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';
import { StatTile } from '../charts/StatTile';

type Metric = 'count' | 'revenue';

interface LossSectionProps {
  loss: LossAnalysisResult;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function LossSection({ loss, filters, filterOptions }: LossSectionProps) {
  const [metric, setMetric] = useState<Metric>('count');

  const rows: BarChartRow[] = [...loss.reasons]
    .sort((a, b) => (metric === 'count' ? b.count - a.count : b.revenue - a.revenue))
    .map((r) => ({
      key: r.reason,
      label: r.reason,
      value: metric === 'count' ? r.count : r.revenue,
      displayValue: metric === 'count' ? r.count.toLocaleString('en-IN') : formatCompactCurrency(r.revenue),
    }));

  const info: ChartInfo = {
    title: `Lost Lead Analysis — ${metric === 'count' ? 'Lost Leads by Reason' : 'Lost Revenue by Reason'}`,
    chartType: 'Horizontal bar chart',
    description: `Lost leads grouped by lost_reason, measured by ${metric === 'count' ? 'count' : 'deal value'}.`,
    formula: FORMULA.lostByReason,
    dataGrain: GRAIN.lead,
    dateSemantics: DATE_SEMANTICS.createdAt,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'dateRange'],
    recordsIncluded: loss.totalLostCount,
    recordsLabel: 'lost leads',
    values: rows.map((r) => ({ label: r.label, value: r.displayValue })),
    caveat:
      'A handful of lost leads have no recorded reason (they faded out rather than being explicitly disqualified) — kept as "Not specified" rather than dropped. Shown as a bar rather than a donut because there are too many distinct reasons (9) to stay reliably readable as a donut, and count/revenue are never mixed on one axis.',
  };

  return (
    <SectionCard
      title="Lost Lead Analysis"
      description="Why filtered leads were lost, and how much deal value that represents."
      controls={
        <SegmentedControl
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'count', label: 'Count' },
            { value: 'revenue', label: 'Lost Revenue' },
          ]}
        />
      }
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <div className="stat-grid stat-grid--compact">
        <StatTile label="Lost Leads" value={loss.totalLostCount.toLocaleString('en-IN')} tone="negative" />
        <StatTile label="Lost Revenue" value={formatCompactCurrency(loss.totalLostRevenue)} tone="negative" />
      </div>
      <BarChart rows={rows} emptyMessage="No lost leads for the selected filters." />
    </SectionCard>
  );
}
