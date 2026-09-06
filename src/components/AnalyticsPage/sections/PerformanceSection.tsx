import { useMemo, useState } from 'react';
import { calculateDimensionPerformance, sortRows } from '../../../analytics/calculations';
import type { DimensionPerformanceRow, TargetRow } from '../../../analytics/calculations';
import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import { formatCompactCurrency, formatPercent } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState, BreakdownMetric, PerformanceDimension } from '../../../analytics/types';
import type { Delivery, EnrichedLead } from '../../../data/types';
import { branchColorVar } from '../../DataExplorer/colors';
import { BarChart, type BarChartRow } from '../charts/BarChart';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { MetricTable } from '../charts/MetricTable';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';

interface PerformanceSectionProps {
  filteredLeads: EnrichedLead[];
  filteredDeliveries: Delivery[];
  referenceNowIso: string;
  branchIndexById: Map<string, number>;
  targetRowsByBranch: TargetRow[];
  targetsApplicable: boolean;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

const DIMENSIONS: { value: PerformanceDimension; label: string }[] = [
  { value: 'branch', label: 'Branch' },
  { value: 'rep', label: 'Rep' },
  { value: 'source', label: 'Source' },
  { value: 'model', label: 'Model' },
];

const DIMENSION_LABEL: Record<PerformanceDimension, string> = {
  branch: 'branch',
  rep: 'sales rep',
  source: 'lead source',
  model: 'model',
};

const BASE_METRICS: { value: BreakdownMetric; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'pipeline', label: 'Pipeline' },
];

const METRIC_FORMULA: Record<BreakdownMetric, string> = {
  leads: 'Count of filtered leads',
  delivered: 'Count of leads with status = Delivered',
  revenue: FORMULA.deliveredRevenue,
  conversion: FORMULA.conversionRate,
  pipeline: FORMULA.activePipeline,
  targetAchievement: FORMULA.targetAchievement,
};

const METRIC_DATE: Record<BreakdownMetric, string> = {
  leads: DATE_SEMANTICS.createdAt,
  delivered: DATE_SEMANTICS.deliveryDate,
  revenue: DATE_SEMANTICS.deliveryDate,
  conversion: DATE_SEMANTICS.createdAt,
  pipeline: DATE_SEMANTICS.createdAt,
  targetAchievement: DATE_SEMANTICS.targetMonth,
};

export function PerformanceSection({
  filteredLeads,
  filteredDeliveries,
  referenceNowIso,
  branchIndexById,
  targetRowsByBranch,
  targetsApplicable,
  filters,
  filterOptions,
}: PerformanceSectionProps) {
  const [dim, setDim] = useState<PerformanceDimension>('branch');
  const [metric, setMetric] = useState<BreakdownMetric>('revenue');

  const metricOptions =
    dim === 'branch' && targetsApplicable ? [...BASE_METRICS, { value: 'targetAchievement' as const, label: 'Target Achv.' }] : BASE_METRICS;

  const effectiveMetric = metricOptions.some((m) => m.value === metric) ? metric : 'revenue';

  const rows = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, dim, referenceNowIso, dim === 'branch' ? targetRowsByBranch : undefined),
    [filteredLeads, filteredDeliveries, dim, referenceNowIso, targetRowsByBranch],
  );

  const sorted = useMemo(() => sortRows(rows, effectiveMetric), [rows, effectiveMetric]);

  const chartRows: BarChartRow[] = sorted.map((r) => ({
    key: r.key,
    label: r.label,
    value: metricValue(r, effectiveMetric),
    displayValue: formatMetric(r, effectiveMetric),
    color: dim === 'branch' ? branchColorVar(branchIndexById.get(r.key) ?? 0) : undefined,
    flag: effectiveMetric === 'conversion' && r.lowSample ? 'low n' : undefined,
  }));

  const metricLabel = metricOptions.find((m) => m.value === effectiveMetric)?.label ?? effectiveMetric;
  const dimLabel = DIMENSION_LABEL[dim];

  const info: ChartInfo = {
    title: `${metricLabel} by ${dimLabel}`,
    chartType: 'Horizontal bar chart + detail table',
    description: `${metricLabel} for each ${DIMENSION_LABEL[dim]}, ranked highest to lowest.`,
    formula: `${METRIC_FORMULA[effectiveMetric]}, grouped by ${DIMENSION_LABEL[dim]}`,
    dataGrain: effectiveMetric === 'targetAchievement' ? `${GRAIN.lead} + ${GRAIN.target}` : GRAIN.lead,
    dateSemantics: METRIC_DATE[effectiveMetric],
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'status', 'dateRange'],
    recordsIncluded: filteredLeads.length,
    recordsLabel: 'leads in the filtered slice',
    values: chartRows.slice(0, 6).map((r) => ({ label: r.label, value: r.displayValue })),
    caveat:
      effectiveMetric === 'conversion'
        ? `Rows flagged "low n" have fewer than 5 leads — treat their conversion rate with caution.`
        : dim === 'rep' || dim === 'branch'
          ? 'When Branch is filtered, only reps belonging to that branch can appear here.'
          : undefined,
  };

  return (
    <SectionCard
      title="Performance Explorer"
      description="Slice leads, revenue, conversion, and pipeline value by branch, rep, source, or model — one reusable view instead of a dozen fixed charts."
      controls={
        <div className="analytics-controls-stack">
          <SegmentedControl value={dim} onChange={setDim} options={DIMENSIONS} />
          <SegmentedControl value={effectiveMetric} onChange={setMetric} options={metricOptions} />
        </div>
      }
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <BarChart rows={chartRows} />
      <MetricTable rows={sorted} showTargets={dim === 'branch' && targetsApplicable} />
    </SectionCard>
  );
}

function metricValue(row: DimensionPerformanceRow, metric: BreakdownMetric): number {
  switch (metric) {
    case 'leads':
      return row.leadCount;
    case 'delivered':
      return row.deliveredCount;
    case 'revenue':
      return row.revenue;
    case 'conversion':
      return row.conversionPct ?? 0;
    case 'pipeline':
      return row.pipelineValue;
    case 'targetAchievement':
      return row.targetAchievementPct ?? 0;
  }
}

function formatMetric(row: DimensionPerformanceRow, metric: BreakdownMetric): string {
  switch (metric) {
    case 'leads':
      return row.leadCount.toLocaleString('en-IN');
    case 'delivered':
      return row.deliveredCount.toLocaleString('en-IN');
    case 'revenue':
      return formatCompactCurrency(row.revenue);
    case 'conversion':
      return row.conversionPct === null ? '—' : formatPercent(row.conversionPct);
    case 'pipeline':
      return formatCompactCurrency(row.pipelineValue);
    case 'targetAchievement':
      return row.targetAchievementPct === null || row.targetAchievementPct === undefined ? '—' : formatPercent(row.targetAchievementPct);
  }
}
