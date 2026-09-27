import { useMemo, useState } from 'react';
import { calculateDimensionPerformance } from '../../../analytics/calculations';
import { FORMULA, DATE_SEMANTICS, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import { formatCompactCurrency } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import type { DealershipDataset, Delivery, EnrichedLead } from '../../../data/types';
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

interface RankedDealershipsSectionProps {
  filteredLeads: EnrichedLead[];
  filteredDeliveries: Delivery[];
  /** Same cohort as filteredLeads/filteredDeliveries but with the branch
   * filter itself lifted, so a branch's true rank among ALL branches can
   * still be shown even when the branch filter narrows the table to it alone. */
  allBranchesLeads: EnrichedLead[];
  allBranchesDeliveries: Delivery[];
  referenceNowIso: string;
  raw: DealershipDataset;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

function metricValue(row: { revenue: number; deliveredCount: number; avgDealValue: number | null }, metric: RankMetric): number {
  return metric === 'revenue' ? row.revenue : metric === 'units' ? row.deliveredCount : (row.avgDealValue ?? -1);
}

export function RankedDealershipsSection({
  filteredLeads,
  filteredDeliveries,
  allBranchesLeads,
  allBranchesDeliveries,
  referenceNowIso,
  raw,
  filters,
  filterOptions,
}: RankedDealershipsSectionProps) {
  const [metric, setMetric] = useState<RankMetric>('revenue');

  const branchById = useMemo(() => new Map(raw.branches.map((b) => [b.id, b])), [raw]);
  const managerByBranchId = useMemo(() => {
    const map = new Map<string, string>();
    for (const rep of raw.sales_reps) {
      if (rep.role === 'branch_manager') map.set(rep.branch_id, rep.name);
    }
    return map;
  }, [raw]);

  const rows = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'branch', referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );

  const ranked = useMemo(() => [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)), [rows, metric]);

  // Overall rank comes from the branch-filter-free cohort, so it stays
  // correct even when the branch filter itself narrows `ranked` down to a
  // single row (see the prop doc above).
  const overallRank = useMemo(() => {
    const allRows = calculateDimensionPerformance(allBranchesLeads, allBranchesDeliveries, 'branch', referenceNowIso);
    const allRanked = [...allRows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
    return new Map(allRanked.map((r, i) => [r.key, i + 1]));
  }, [allBranchesLeads, allBranchesDeliveries, referenceNowIso, metric]);

  const info: ChartInfo = {
    title: 'Which branches are performing best?',
    chartType: 'Ranked table',
    description: 'Every branch ranked by the selected metric, computed from the same filtered leads as the rest of Analytics.',
    formula: `${FORMULA.deliveredRevenue}; Units = count of leads with status = Delivered; Avg Deal Value = Revenue / Units — grouped by branch`,
    dataGrain: GRAIN.lead,
    dateSemantics: DATE_SEMANTICS.deliveryDate,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'status', 'dateRange'],
    recordsIncluded: filteredLeads.length,
    recordsLabel: 'leads in the filtered slice',
    values: ranked.slice(0, 5).map((r) => ({
      label: r.label.split(' — ')[1] ?? r.label,
      value: metric === 'revenue' ? formatCompactCurrency(r.revenue) : metric === 'units' ? String(r.deliveredCount) : r.avgDealValue === null ? '—' : formatCompactCurrency(r.avgDealValue),
    })),
  };

  return (
    <SectionCard
      title="Which branches are performing best?"
      description="Your branches ranked side by side — a quick way to spot who to learn from, and who might need a closer look."
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
                <th>Dealership</th>
                <th>Location</th>
                <th>Manager</th>
                <th className="col-right">Units</th>
                <th className="col-right">Revenue</th>
                <th className="col-right">Avg Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, i) => {
                const branch = branchById.get(row.key);
                const rank = overallRank.get(row.key) ?? i + 1;
                return (
                  <tr key={row.key} className={rank <= 3 ? 'ranking-row--top' : undefined}>
                    <td className="col-right">
                      <span className={`ranking-badge ranking-badge--${rank <= 3 ? rank : 'default'}`}>{rank}</span>
                    </td>
                    <td>{branch?.name ?? row.label}</td>
                    <td>{branch?.city ?? '—'}</td>
                    <td>{managerByBranchId.get(row.key) ?? '—'}</td>
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
