import type { DimensionPerformanceRow } from '../../../analytics/calculations';
import { formatCompactCurrency, formatDays, formatPercent } from '../../../analytics/format';
import { EmptyState } from './EmptyState';

interface MetricTableProps {
  rows: DimensionPerformanceRow[];
  showTargets: boolean;
  emptyMessage?: string;
}

const dash = '—';

export function MetricTable({ rows, showTargets, emptyMessage }: MetricTableProps) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="metric-table-wrap">
      <table className="metric-table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="col-right">Leads</th>
            <th className="col-right">Delivered</th>
            <th className="col-right">Conversion</th>
            <th className="col-right">Revenue</th>
            <th className="col-right">Pipeline</th>
            <th className="col-right">Lost</th>
            <th className="col-right">Loss Rate</th>
            <th className="col-right">Avg Deal</th>
            <th className="col-right">Median Cycle</th>
            <th className="col-right">Stale</th>
            <th className="col-right">Overdue</th>
            {showTargets && <th className="col-right">Target Achv.</th>}
            {showTargets && <th className="col-right">Median Delivery</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td className="col-right">
                {row.leadCount.toLocaleString('en-IN')}
                {row.lowSample && (
                  <span className="metric-table__flag" title={`Fewer than 5 leads — treat conversion here with caution`}>
                    low n
                  </span>
                )}
              </td>
              <td className="col-right">{row.deliveredCount.toLocaleString('en-IN')}</td>
              <td className="col-right">{row.conversionPct === null ? dash : formatPercent(row.conversionPct)}</td>
              <td className="col-right">{formatCompactCurrency(row.revenue)}</td>
              <td className="col-right">{formatCompactCurrency(row.pipelineValue)}</td>
              <td className="col-right">{row.lostCount.toLocaleString('en-IN')}</td>
              <td className="col-right">{row.lossRatePct === null ? dash : formatPercent(row.lossRatePct)}</td>
              <td className="col-right">{row.avgDealValue === null ? dash : formatCompactCurrency(row.avgDealValue)}</td>
              <td className="col-right">{row.medianCycleDays === null ? dash : formatDays(row.medianCycleDays)}</td>
              <td className="col-right">{row.staleCount.toLocaleString('en-IN')}</td>
              <td className="col-right">{row.overdueCount.toLocaleString('en-IN')}</td>
              {showTargets && (
                <td className="col-right">
                  {row.targetAchievementPct === undefined || row.targetAchievementPct === null
                    ? dash
                    : formatPercent(row.targetAchievementPct)}
                </td>
              )}
              {showTargets && (
                <td className="col-right">
                  {row.medianDeliveryDays === undefined || row.medianDeliveryDays === null
                    ? dash
                    : formatDays(row.medianDeliveryDays)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
