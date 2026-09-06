import { useMemo, useState } from 'react';
import { calculateTargetPerformance } from '../../../analytics/calculations';
import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import { formatCompactCurrency, formatPercent } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import type { DealershipDataset } from '../../../data/types';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { GroupedColumnChart } from '../charts/GroupedColumnChart';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';
import { StatTile } from '../charts/StatTile';

type Breakdown = 'branch' | 'month';

interface TargetsSectionProps {
  raw: DealershipDataset;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function TargetsSection({ raw, filters, filterOptions }: TargetsSectionProps) {
  const [breakdown, setBreakdown] = useState<Breakdown>('branch');

  const result = useMemo(() => calculateTargetPerformance(raw, filters, breakdown), [raw, filters, breakdown]);

  const info: ChartInfo = {
    title: 'Targets vs Actual',
    chartType: 'Grouped bar chart + progress bars',
    description: `Delivered revenue and units against the applicable branch/month targets, broken down by ${breakdown}.`,
    formula: `${FORMULA.targetAchievement}\n${FORMULA.unitAchievement}\n${FORMULA.revenueGap}`,
    dataGrain: GRAIN.target,
    dateSemantics: DATE_SEMANTICS.targetMonth,
    relevantFilters: ['branch', 'dateRange'],
    values: result.applicable
      ? result.rows.map((r) => ({ label: r.label, value: `${formatCompactCurrency(r.actualRevenue)} of ${formatCompactCurrency(r.targetRevenue)}` }))
      : undefined,
    caveat: result.applicable
      ? 'Rep, source, model, and status filters are ignored here — targets are only defined at the branch/month grain, so they never apply to a slice below that.'
      : (result.reason ?? undefined),
  };

  return (
    <SectionCard
      title="Targets vs Actual"
      description="Delivered revenue and units against the applicable branch/month targets for this selection."
      controls={
        <SegmentedControl
          value={breakdown}
          onChange={setBreakdown}
          options={[
            { value: 'branch', label: 'Branch' },
            { value: 'month', label: 'Month' },
          ]}
        />
      }
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      {!result.applicable ? (
        <p className="analytics-note">{result.reason}</p>
      ) : (
        <>
          <div className="stat-grid stat-grid--compact">
            <StatTile
              label="Revenue Achievement"
              value={result.totals.revenueAchievementPct === null ? '—' : formatPercent(result.totals.revenueAchievementPct)}
              hint={`${formatCompactCurrency(result.totals.actualRevenue)} of ${formatCompactCurrency(result.totals.targetRevenue)}`}
              meterPct={result.totals.revenueAchievementPct}
            />
            <StatTile
              label="Unit Achievement"
              value={result.totals.unitAchievementPct === null ? '—' : formatPercent(result.totals.unitAchievementPct)}
              hint={`${result.totals.actualUnits} of ${result.totals.targetUnits} units`}
              meterPct={result.totals.unitAchievementPct}
            />
          </div>
          <GroupedColumnChart
            rows={result.rows.map((r) => ({ key: r.key, label: r.label, actual: r.actualRevenue, target: r.targetRevenue }))}
            formatValue={formatCompactCurrency}
          />
        </>
      )}
    </SectionCard>
  );
}
