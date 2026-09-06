import { useState } from 'react';
import { COMPOSITION_CAVEAT, DATE_SEMANTICS, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { StatusDistributionRow } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { STATUS_COLOR_VARS } from '../../DataExplorer/colors';
import { BarChart, type BarChartRow } from '../charts/BarChart';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { DonutChart, type DonutSlice } from '../charts/DonutChart';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';

type Metric = 'count' | 'value';

interface CurrentPipelineSectionProps {
  rows: StatusDistributionRow[];
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function CurrentPipelineSection({ rows, filters, filterOptions }: CurrentPipelineSectionProps) {
  const [metric, setMetric] = useState<Metric>('count');

  // Pipeline VALUE is only meaningful for still-open stages — a delivered or
  // lost lead's deal value isn't "pipeline" anymore (spec: "only active stages").
  const visible = metric === 'value' ? rows.filter((r) => r.status !== 'delivered' && r.status !== 'lost') : rows;

  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);

  const info: ChartInfo =
    metric === 'count'
      ? {
          title: 'Current Pipeline — Lead Count',
          chartType: 'Donut chart',
          description: "Composition of leads by their CURRENT status right now — not the historical journey each lead took.",
          formula: 'Count of leads grouped by current lead.status',
          dataGrain: GRAIN.lead,
          dateSemantics: DATE_SEMANTICS.snapshot,
          relevantFilters: ['branch', 'salesRep', 'source', 'model', 'dateRange'],
          recordsIncluded: totalCount,
          recordsLabel: 'leads matching the filters',
          values: rows.map((r) => ({ label: r.label, value: `${r.count.toLocaleString('en-IN')} (${totalCount ? Math.round((r.count / totalCount) * 100) : 0}%)` })),
          caveat: COMPOSITION_CAVEAT,
        }
      : {
          title: 'Current Pipeline — Pipeline Value',
          chartType: 'Horizontal bar chart',
          description: 'Deal value of leads that are still open, broken down by current status.',
          formula: 'Σ deal_value for leads where status is neither Delivered nor Lost, grouped by current status',
          dataGrain: GRAIN.lead,
          dateSemantics: DATE_SEMANTICS.snapshot,
          relevantFilters: ['branch', 'salesRep', 'source', 'model', 'dateRange'],
          values: visible.map((r) => ({ label: r.label, value: formatCompactCurrency(r.value) })),
          caveat: 'A bar is used here (rather than a donut) because exact ₹ comparison across stages matters more than overall composition.',
        };

  const barRows: BarChartRow[] = visible
    .map((r) => ({
      key: r.status,
      label: r.label,
      value: metric === 'count' ? r.count : r.value,
      displayValue: metric === 'count' ? r.count.toLocaleString('en-IN') : formatCompactCurrency(r.value),
      color: STATUS_COLOR_VARS[r.status],
    }))
    .sort((a, b) => b.value - a.value);

  const donutSlices: DonutSlice[] = rows.map((r) => ({ key: r.status, label: r.label, value: r.count, color: STATUS_COLOR_VARS[r.status] }));

  return (
    <SectionCard
      title="Current Pipeline"
      description="Where leads are sitting right now, by current status — not the historical journey."
      controls={
        <SegmentedControl
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'count', label: 'Lead Count' },
            { value: 'value', label: 'Pipeline Value' },
          ]}
        />
      }
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      {metric === 'count' ? (
        <DonutChart slices={donutSlices} formatValue={(v) => v.toLocaleString('en-IN')} />
      ) : (
        <BarChart rows={barRows} />
      )}
    </SectionCard>
  );
}
