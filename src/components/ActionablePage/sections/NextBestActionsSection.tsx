import type { DealRiskRow } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import { EmptyState } from '../../AnalyticsPage/charts/EmptyState';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';

interface NextBestActionsSectionProps {
  rows: DealRiskRow[];
  onViewDeal: (leadId: string) => void;
  onViewRep: (repId: string) => void;
  onViewBranch: (branchId: string) => void;
}

/** The concrete, per-deal translation of the priorities above — a short list
 * of "do this now" cards instead of raw metrics. Every card is one real deal
 * from the filtered dataset; the buttons navigate to existing views (the lead
 * journey modal, or the deals table filtered to that rep/branch) rather than
 * pretending to mutate a CRM this app doesn't have write access to. */
export function NextBestActionsSection({ rows, onViewDeal, onViewRep, onViewBranch }: NextBestActionsSectionProps) {
  const top = rows.slice(0, 6);

  return (
    <SectionCard
      title="Next Best Actions"
      description="The deals most worth acting on today, each with a specific next step — not just a number to stare at."
    >
      {top.length === 0 ? (
        <EmptyState message="Nothing here needs urgent action in this filter." />
      ) : (
        <div className="action-grid">
          {top.map((row) => (
            <article key={row.leadId} className={`action-card action-card--${row.risk}`}>
              <div className="action-card__head">
                <span className="action-card__customer">{row.customerName}</span>
                <span className={`action-card__health action-card__health--${row.risk}`}>
                  {row.risk === 'high' ? 'High Risk' : 'Needs Attention'}
                </span>
              </div>
              <div className="action-card__meta">
                <span>{formatCompactCurrency(row.dealValue)}</span>
                <span>·</span>
                <span>{row.stageLabel}</span>
                <span>·</span>
                <span>Quiet {row.daysSinceActivity}d</span>
              </div>
              <p className="action-card__reason">{row.reason}</p>
              <p className="action-card__recommendation">
                <strong>What to do:</strong> {row.recommendedAction}
              </p>
              <div className="action-card__buttons">
                <button type="button" onClick={() => onViewDeal(row.leadId)}>
                  View Deal
                </button>
                <button type="button" onClick={() => onViewRep(row.repId)}>
                  View Rep
                </button>
                <button type="button" onClick={() => onViewBranch(row.branchId)}>
                  View Branch
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
