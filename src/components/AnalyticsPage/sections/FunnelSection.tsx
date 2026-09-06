import { DATE_SEMANTICS, FORMULA, FUNNEL_CAVEAT, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { FunnelResult } from '../../../analytics/calculations';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { FunnelChart } from '../charts/FunnelChart';
import { SectionCard } from '../charts/SectionCard';

interface FunnelSectionProps {
  funnel: FunnelResult;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function FunnelSection({ funnel, filters, filterOptions }: FunnelSectionProps) {
  const info: ChartInfo = {
    title: 'Lead Journey — Historical Funnel',
    chartType: 'Funnel',
    description: "Every stage a filtered lead's status history ever reached, regardless of where it sits today.",
    formula: `${FORMULA.stageReached}\n${FORMULA.stageConversion}`,
    dataGrain: GRAIN.statusHistory,
    dateSemantics: DATE_SEMANTICS.statusHistory,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'status', 'dateRange'],
    recordsIncluded: funnel.stages[0]?.reachedCount,
    recordsLabel: 'leads reached the first (New) stage',
    values: funnel.stages.map((s) => ({ label: s.label, value: s.reachedCount.toLocaleString('en-IN') })),
    interpretation: funnel.largestDropOff
      ? `The largest drop-off is ${funnel.largestDropOff.fromLabel} → ${funnel.largestDropOff.toLabel}, where ${funnel.largestDropOff.dropOffPct.toFixed(0)}% of leads that reached ${funnel.largestDropOff.fromLabel} did not advance.`
      : undefined,
    caveat: FUNNEL_CAVEAT,
  };

  return (
    <SectionCard
      title="Lead Journey — Historical Funnel"
      description="Every stage a filtered lead's status history ever reached, regardless of where it sits today."
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <FunnelChart result={funnel} />
    </SectionCard>
  );
}
