import { useMemo, useState } from 'react';
import { calculateMonthlyTrend, calculateTargetPerformance } from '../../../analytics/calculations';
import type { TrendMetric } from '../../../analytics/calculations';
import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import { formatCompactCurrency, formatCompactNumber, formatPercent } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import type { DealershipDataset, Delivery, EnrichedLead } from '../../../data/types';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { LineChart, type LineChartPoint } from '../charts/LineChart';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';

interface TrendSectionProps {
  raw: DealershipDataset;
  filteredLeads: EnrichedLead[];
  filteredDeliveries: Delivery[];
  referenceNowIso: string;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

type Metric = TrendMetric | 'targetAchievement';

const METRICS: { value: Metric; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'delivered', label: 'Delivered Units' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'targetAchievement', label: 'Target Achv.' },
];

const DESCRIPTION: Record<Metric, string> = {
  leads: 'Leads created, by month.',
  delivered: 'Units delivered, by delivery month.',
  revenue: 'Revenue recognized, by delivery month.',
  conversion: 'Conversion rate by lead creation cohort — hollow points are cohorts still too young to have fully converted.',
  targetAchievement: 'Delivered revenue against target, by month.',
};

const DATE_BASIS: Record<Metric, string> = {
  leads: DATE_SEMANTICS.createdAt,
  delivered: DATE_SEMANTICS.deliveryDate,
  revenue: DATE_SEMANTICS.deliveryDate,
  conversion: 'Each point groups leads by their creation month, then checks how many of that cohort eventually delivered.',
  targetAchievement: DATE_SEMANTICS.targetMonth,
};

const FORMULA_BY_METRIC: Record<Metric, string> = {
  leads: 'Count of leads, grouped by created_at month',
  delivered: 'Count of delivered leads, grouped by delivery month',
  revenue: `${FORMULA.deliveredRevenue}, grouped by delivery month`,
  conversion: `${FORMULA.conversionRate}, computed per lead-creation-month cohort`,
  targetAchievement: `${FORMULA.targetAchievement}, computed per month`,
};

function formatterFor(metric: Metric) {
  if (metric === 'revenue') return formatCompactCurrency;
  if (metric === 'conversion' || metric === 'targetAchievement') return (v: number) => formatPercent(v, 0);
  return formatCompactNumber;
}

export function TrendSection({ raw, filteredLeads, filteredDeliveries, referenceNowIso, filters, filterOptions }: TrendSectionProps) {
  const [metric, setMetric] = useState<Metric>('leads');

  const trendPoints = useMemo(
    () => (metric === 'targetAchievement' ? [] : calculateMonthlyTrend(filteredLeads, filteredDeliveries, metric, referenceNowIso)),
    [filteredLeads, filteredDeliveries, metric, referenceNowIso],
  );

  const targetPerf = useMemo(
    () => (metric === 'targetAchievement' ? calculateTargetPerformance(raw, filters, 'month') : null),
    [raw, filters, metric],
  );

  const points: LineChartPoint[] =
    metric === 'targetAchievement'
      ? (targetPerf?.rows ?? []).map((r) => ({ key: r.key, label: r.label, value: r.revenueAchievementPct }))
      : trendPoints.map((p) => ({ key: p.month, label: p.label, value: p.value, provisional: p.isMature === false }));

  const hasProvisional = metric === 'conversion' && trendPoints.some((p) => p.isMature === false);

  const info: ChartInfo = {
    title: `Trends — ${METRICS.find((m) => m.value === metric)?.label}`,
    chartType: 'Line chart',
    description: DESCRIPTION[metric],
    formula: FORMULA_BY_METRIC[metric],
    dataGrain: metric === 'targetAchievement' ? GRAIN.target : GRAIN.lead,
    dateSemantics: DATE_BASIS[metric],
    relevantFilters: metric === 'targetAchievement' ? ['branch', 'dateRange'] : ['branch', 'salesRep', 'source', 'model', 'dateRange'],
    values: points.filter((p) => p.value !== null).map((p) => ({ label: p.label, value: formatterFor(metric)(p.value as number) })),
    caveat:
      metric === 'conversion'
        ? 'Hollow points are cohorts still maturing — their conversion rate will rise as more leads finish their journey.'
        : metric === 'targetAchievement' && !targetPerf?.applicable
          ? (targetPerf?.reason ?? undefined)
          : undefined,
  };

  return (
    <SectionCard
      title="How has performance changed over time?"
      description={DESCRIPTION[metric]}
      controls={<SegmentedControl value={metric} onChange={setMetric} options={METRICS} />}
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      {metric === 'targetAchievement' && !targetPerf?.applicable ? (
        <p className="analytics-note">{targetPerf?.reason}</p>
      ) : (
        <LineChart points={points} formatValue={formatterFor(metric)} />
      )}
      {hasProvisional && (
        <p className="analytics-note">Hollow points are cohorts still maturing — their conversion rate will rise as more leads finish their journey.</p>
      )}
    </SectionCard>
  );
}
