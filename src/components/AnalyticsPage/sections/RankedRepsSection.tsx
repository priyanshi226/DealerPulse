import { useMemo, useState } from 'react';
import { calculateDimensionPerformance } from '../../../analytics/calculations';
import { FORMULA, DATE_SEMANTICS, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import { formatCompactCurrency } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import type { Delivery, EnrichedLead } from '../../../data/types';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { EmptyState } from '../charts/EmptyState';
import { SectionCard } from '../charts/SectionCard';
import { SegmentedControl } from '../charts/SegmentedControl';

type RankMetric = 'revenue' | 'units' | 'avgDealValue';

const METRIC_OPTIONS: { value: RankMetric; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'units', label: 'Units' },
  { value: 'avgDealValue', label: 'Avg Deal Value' },
];

interface RankedRepsSectionProps {
  filteredLeads: EnrichedLead[];
  filteredDeliveries: Delivery[];
  /** Same cohort as filteredLeads/filteredDeliveries but with the sales rep
   * filter itself lifted, so a rep's true rank among ALL reps can still be
   * shown even when the rep filter narrows the table to them alone. */
  allRepsLeads: EnrichedLead[];
  allRepsDeliveries: Delivery[];
  referenceNowIso: string;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

function metricValue(row: { revenue: number; deliveredCount: number; avgDealValue: number | null }, metric: RankMetric): number {
  return metric === 'revenue' ? row.revenue : metric === 'units' ? row.deliveredCount : (row.avgDealValue ?? -1);
}

export function RankedRepsSection({
  filteredLeads,
  filteredDeliveries,
  allRepsLeads,
  allRepsDeliveries,
  referenceNowIso,
  filters,
  filterOptions,
}: RankedRepsSectionProps) {
  const [metric, setMetric] = useState<RankMetric>('revenue');

  const rows = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'rep', referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );

  const ranked = useMemo(() => [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)), [rows, metric]);

  // Overall rank comes from the rep-filter-free cohort, so it stays correct
  // even when the rep filter itself narrows `ranked` down to a single row.
  const overallRank = useMemo(() => {
    const allRows = calculateDimensionPerformance(allRepsLeads, allRepsDeliveries, 'rep', referenceNowIso);
    const allRanked = [...allRows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
    return new Map(allRanked.map((r, i) => [r.key, i + 1]));
  }, [allRepsLeads, allRepsDeliveries, referenceNowIso, metric]);

  const info: ChartInfo = {
    title: 'Who is driving sales?',
    chartType: 'Ranked table',
    description: 'Every sales rep ranked by the selected metric, computed from the same filtered leads as the rest of Analytics.',
    formula: `${FORMULA.deliveredRevenue}; Units = count of leads with status = Delivered; Avg Deal Value = Revenue / Units — grouped by rep`,
    dataGrain: GRAIN.lead,
    dateSemantics: DATE_SEMANTICS.deliveryDate,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'status', 'dateRange'],
    recordsIncluded: filteredLeads.length,
    recordsLabel: 'leads in the filtered slice',
    values: ranked.slice(0, 5).map((r) => ({
      label: r.label.split(' — ')[1] ?? r.label,
      value: metric === 'revenue' ? formatCompactCurrency(r.revenue) : metric === 'units' ? String(r.deliveredCount) : r.avgDealValue === null ? '—' : formatCompactCurrency(r.avgDealValue),
    })),
    caveat: 'Rows flagged "low n" have fewer than 5 leads — treat their average deal value with caution.',
  };

  return (
    <SectionCard
      title="Who is driving sales?"
      description="Your team ranked side by side — useful for recognizing your top performers and spotting who could use support."
      controls={<SegmentedControl value={metric} onChange={setMetric} options={METRIC_OPTIONS} />}
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      {ranked.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th className="col-right">Rank</th>
                <th>Sales Rep</th>
                <th className="col-right">Active Deals</th>
                <th className="col-right">Units</th>
                <th className="col-right">Revenue</th>
                <th className="col-right">Avg Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, i) => {
                const rank = overallRank.get(row.key) ?? i + 1;
                return (
                  <tr key={row.key} className={rank <= 3 ? 'ranking-row--top' : undefined}>
                    <td className="col-right">
                      <span className={`ranking-badge ranking-badge--${rank <= 3 ? rank : 'default'}`}>{rank}</span>
                    </td>
                    <td>
                      {row.label.split(' — ')[1] ?? row.label}
                      {row.lowSample && (
                        <span className="metric-table__flag" title="Fewer than 5 leads — treat this rep's figures with caution">
                          low n
                        </span>
                      )}
                    </td>
                    <td className="col-right">{(row.leadCount - row.deliveredCount - row.lostCount).toLocaleString('en-IN')}</td>
                    <td className="col-right">{row.deliveredCount.toLocaleString('en-IN')}</td>
                    <td className="col-right">{formatCompactCurrency(row.revenue)}</td>
                    <td className="col-right">{row.avgDealValue === null ? '—' : formatCompactCurrency(row.avgDealValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
