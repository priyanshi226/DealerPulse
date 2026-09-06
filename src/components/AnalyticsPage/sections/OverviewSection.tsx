import { FORMULA, DATE_SEMANTICS, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { OverviewResult } from '../../../analytics/calculations';
import { formatCompactCurrency, formatPercent } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { SectionCard } from '../charts/SectionCard';
import { StatTile } from '../charts/StatTile';

interface OverviewSectionProps {
  overview: OverviewResult;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function OverviewSection({ overview, filters, filterOptions }: OverviewSectionProps) {
  const info: ChartInfo = {
    title: 'How are we performing?',
    chartType: 'KPI cards',
    description: 'The vital signs of the business — every number here updates instantly as you change the filters above.',
    formula: [
      FORMULA.deliveredRevenue,
      FORMULA.conversionRate,
      FORMULA.lossRate,
      FORMULA.activePipeline,
      FORMULA.targetAchievement,
    ].join('\n'),
    dataGrain: `${GRAIN.lead} (Target Achievement additionally uses ${GRAIN.target})`,
    dateSemantics: `Total/Lost Leads use ${DATE_SEMANTICS.createdAt} Delivered Revenue/Units use ${DATE_SEMANTICS.deliveryDate} ${DATE_SEMANTICS.targetMonth}`,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'status', 'dateRange'],
    recordsIncluded: overview.totalLeads,
    recordsLabel: 'leads matching the filters',
    values: [
      { label: 'Total Leads', value: overview.totalLeads.toLocaleString('en-IN') },
      { label: 'Delivered Units', value: overview.deliveredUnits.toLocaleString('en-IN') },
      { label: 'Delivered Revenue', value: formatCompactCurrency(overview.deliveredRevenue) },
      { label: 'Active Pipeline Value', value: formatCompactCurrency(overview.activePipelineValue) },
      { label: 'Conversion Rate', value: overview.conversionPct === null ? '—' : formatPercent(overview.conversionPct, 1) },
      { label: 'Lost Leads', value: overview.lostCount.toLocaleString('en-IN') },
      { label: 'Loss Rate', value: overview.lossRatePct === null ? '—' : formatPercent(overview.lossRatePct, 1) },
      {
        label: 'Target Achievement',
        value: overview.targetAchievementPct === null ? 'Not applicable' : formatPercent(overview.targetAchievementPct, 0),
      },
    ],
    caveat: overview.targetNotApplicableReason ?? undefined,
  };

  return (
    <SectionCard
      title="How are we performing?"
      description="The vital signs of the business, at a glance."
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <div className="stat-grid">
        <StatTile label="Total Leads" value={overview.totalLeads.toLocaleString('en-IN')} />
        <StatTile label="Delivered Units" value={overview.deliveredUnits.toLocaleString('en-IN')} />
        <StatTile label="Delivered Revenue" value={formatCompactCurrency(overview.deliveredRevenue)} />
        <StatTile label="Active Pipeline Value" value={formatCompactCurrency(overview.activePipelineValue)} />
        <StatTile
          label="Conversion Rate"
          value={overview.conversionPct === null ? '—' : formatPercent(overview.conversionPct, 1)}
          meterPct={overview.conversionPct}
          tone="positive"
        />
        <StatTile label="Lost Leads" value={overview.lostCount.toLocaleString('en-IN')} tone="negative" />
        <StatTile
          label="Loss Rate"
          value={overview.lossRatePct === null ? '—' : formatPercent(overview.lossRatePct, 1)}
          meterPct={overview.lossRatePct}
          tone="negative"
        />
        <StatTile
          label="Target Achievement"
          value={overview.targetAchievementPct === null ? '—' : formatPercent(overview.targetAchievementPct, 0)}
          meterPct={overview.targetAchievementPct}
          hint={overview.targetNotApplicableReason ?? undefined}
          tone="neutral"
        />
      </div>
    </SectionCard>
  );
}
