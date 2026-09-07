import { useEffect } from 'react';
import type { DealRiskRow } from '../../analytics/calculations';
import { formatCompactCurrency } from '../../analytics/format';

export interface EntityDetailStat {
  label: string;
  value: string;
}

interface EntityDetailModalProps {
  kind: 'Sales Rep' | 'Branch' | 'Lead Source' | 'Model';
  title: string;
  subtitle: string;
  stats: EntityDetailStat[];
  deals: DealRiskRow[];
  onClose: () => void;
  onViewDeal: (leadId: string) => void;
}

/** The actual destination "View Rep" / "View Branch" open — a real profile,
 * not a silent scroll-and-filter of a table elsewhere on the page. Reuses the
 * same DealRiskRow shape the Deals Requiring Attention table already computes,
 * so the deals listed here are never a second, divergent calculation. */
export function EntityDetailModal({ kind, title, subtitle, stats, deals, onClose, onViewDeal }: EntityDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="entity-detail"
        role="dialog"
        aria-modal="true"
        aria-label={`${kind} details for ${title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="entity-detail__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="entity-detail__header">
          <div className="entity-detail__kind">{kind}</div>
          <div className="entity-detail__title">{title}</div>
          <div className="entity-detail__subtitle">{subtitle}</div>
        </div>

        <div className="entity-detail__stats">
          {stats.map((s) => (
            <div key={s.label} className="entity-detail__stat">
              <span className="entity-detail__stat-label">{s.label}</span>
              <span className="entity-detail__stat-value">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="entity-detail__deals">
          <div className="entity-detail__deals-title">
            {deals.length === 0
              ? 'No deals need attention right now'
              : `${deals.length} deal${deals.length === 1 ? '' : 's'} needing attention`}
          </div>
          {deals.length > 0 && (
            <div className="entity-detail__deal-list">
              {deals.map((row) => (
                <button
                  key={row.leadId}
                  type="button"
                  className="entity-detail__deal-row"
                  onClick={() => onViewDeal(row.leadId)}
                >
                  <span className={`risk-pill risk-pill--${row.risk}`}>{row.risk === 'high' ? 'High' : 'Attention'}</span>
                  <span className="entity-detail__deal-customer">{row.customerName}</span>
                  <span className="entity-detail__deal-meta">
                    {formatCompactCurrency(row.dealValue)} · {row.stageLabel} · {row.daysSinceActivity}d quiet
                  </span>
                  <span className="entity-detail__deal-arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
