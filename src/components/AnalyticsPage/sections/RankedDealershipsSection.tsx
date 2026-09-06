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
  referenceNowIso: string;
  raw: DealershipDataset;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function RankedDealershipsSection({
  filteredLeads,
  filteredDeliveries,
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

  const ranked = useMemo(() => {
    const value = (r: (typeof rows)[number]) =>
      metric === 'revenue' ? r.revenue : metric === 'units' ? r.deliveredCount : (r.avgDealValue ?? -1);
    return [...rows].sort((a, b) => value(b) - value(a));
  }, [rows, metric]);

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
                return (
                  <tr key={row.key} className={i < 3 ? 'ranking-row--top' : undefined}>
                    <td className="col-right">
                      <span className={`ranking-badge ranking-badge--${i + 1 <= 3 ? i + 1 : 'default'}`}>{i + 1}</span>
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
