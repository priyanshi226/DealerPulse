import { useMemo, useState } from 'react';
import type { DealRiskRow } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import type { AnalyticsFilterOptions } from '../../../analytics/types';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { EmptyState } from '../../AnalyticsPage/charts/EmptyState';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';

type SortKey = 'value' | 'idle' | 'risk';
type RiskFilter = 'all' | 'high' | 'medium';

interface DealsAttentionTableProps {
  rows: DealRiskRow[];
  filterOptions: AnalyticsFilterOptions;
  onViewDeal: (leadId: string) => void;
}

const RISK_RANK: Record<DealRiskRow['risk'], number> = { high: 0, medium: 1 };

export function DealsAttentionTable({ rows, filterOptions, onViewDeal }: DealsAttentionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [minValue, setMinValue] = useState<string>('');
  const [minIdleDays, setMinIdleDays] = useState<string>('');

  const stages = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.stage, r.stageLabel);
    return [...map.entries()];
  }, [rows]);

  const repsInScope = useMemo(
    () => (branchFilter === 'all' ? filterOptions.reps : filterOptions.reps.filter((r) => r.branchId === branchFilter)),
    [filterOptions.reps, branchFilter],
  );

  const filtered = useMemo(() => {
    const minValueNum = minValue.trim() === '' ? null : Number(minValue);
    const minIdleNum = minIdleDays.trim() === '' ? null : Number(minIdleDays);

    return rows.filter((r) => {
      if (riskFilter !== 'all' && r.risk !== riskFilter) return false;
      if (branchFilter !== 'all' && r.branchId !== branchFilter) return false;
      if (repFilter !== 'all' && r.repId !== repFilter) return false;
      if (stageFilter !== 'all' && r.stage !== stageFilter) return false;
      if (minValueNum !== null && !Number.isNaN(minValueNum) && r.dealValue < minValueNum) return false;
      if (minIdleNum !== null && !Number.isNaN(minIdleNum) && r.daysSinceActivity < minIdleNum) return false;
      return true;
    });
  }, [rows, riskFilter, branchFilter, repFilter, stageFilter, minValue, minIdleDays]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sortKey) {
      case 'value':
        return copy.sort((a, b) => b.dealValue - a.dealValue);
      case 'idle':
        return copy.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
      case 'risk':
        return copy.sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || b.dealValue - a.dealValue);
    }
  }, [filtered, sortKey]);

  return (
    <SectionCard
      title="Deals Requiring Attention"
      description="Every open deal that's gone quiet, is overdue, or is otherwise worth a second look — sort and filter to find your own priorities."
      info={
        <InfoTooltip label="Risk">
          "High" means a deal has gone quiet for 15+ days, or is both overdue and inactive — these are the most likely to be
          lost. "Needs attention" is milder: some inactivity or a missed close date, but not both.
        </InfoTooltip>
      }
      controls={
        <div className="deals-table__filters">
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}>
            <option value="all">All risk</option>
            <option value="high">High risk</option>
            <option value="medium">Needs attention</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setRepFilter('all');
            }}
          >
            <option value="all">All branches</option>
            {filterOptions.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <select value={repFilter} onChange={(e) => setRepFilter(e.target.value)}>
            <option value="all">All reps</option>
            {repsInScope.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">All stages</option>
            {stages.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Min value (₹)"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            className="deals-table__num-input"
          />
          <input
            type="number"
            placeholder="Min idle days"
            value={minIdleDays}
            onChange={(e) => setMinIdleDays(e.target.value)}
            className="deals-table__num-input"
          />
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="risk">Sort: Risk</option>
            <option value="value">Sort: Deal value</option>
            <option value="idle">Sort: Idle time</option>
          </select>
        </div>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState message="No deals match the current filters." />
      ) : (
        <div className="deals-table-wrap">
          <table className="deals-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Model</th>
                <th className="col-right">Deal Value</th>
                <th>Stage</th>
                <th>Rep</th>
                <th className="col-right">Days Idle</th>
                <th>Risk</th>
                <th>Reason</th>
                <th>Recommended Action</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.leadId}>
                  <td>{row.customerName}</td>
                  <td>{row.model}</td>
                  <td className="col-right">{formatCompactCurrency(row.dealValue)}</td>
                  <td>{row.stageLabel}</td>
                  <td>{row.repName}</td>
                  <td className="col-right">{row.daysSinceActivity}</td>
                  <td>
                    <span className={`risk-pill risk-pill--${row.risk}`}>
                      {row.risk === 'high' ? 'High' : 'Attention'}
                    </span>
                  </td>
                  <td className="deals-table__reason">{row.reason}</td>
                  <td className="deals-table__reason">{row.recommendedAction}</td>
                  <td>
                    <button type="button" className="deals-table__view" onClick={() => onViewDeal(row.leadId)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="deals-table__count">
        Showing {sorted.length} of {rows.length} flagged deals
      </p>
    </SectionCard>
  );
}
