import { useMemo } from 'react';
import type { DealRiskRow } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { EmptyState } from '../../AnalyticsPage/charts/EmptyState';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';

interface DealsAttentionTableProps {
  rows: DealRiskRow[];
  onViewDeal: (leadId: string) => void;
}

const RISK_RANK: Record<DealRiskRow['risk'], number> = { high: 0, medium: 1 };

export function DealsAttentionTable({ rows, onViewDeal }: DealsAttentionTableProps) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || b.dealValue - a.dealValue),
    [rows],
  );

  return (
    <SectionCard
      title="Deals Requiring Attention"
      description="Every open deal that's gone quiet, is overdue, or is otherwise worth a second look."
      info={
        <InfoTooltip label="Risk">
          "High" means a deal has gone quiet for 15+ days, or is both overdue and inactive — these are the most likely to be
          lost. "Needs attention" is milder: some inactivity or a missed close date, but not both.
        </InfoTooltip>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState message="No deals need attention right now." />
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
      <p className="deals-table__count">{sorted.length} flagged deals</p>
    </SectionCard>
  );
}
