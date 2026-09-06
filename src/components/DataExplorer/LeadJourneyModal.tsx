import { useEffect } from 'react';
import type { EnrichedLead } from '../../data/types';
import { STATUS_LABELS } from '../../data/transformations';
import { STATUS_COLOR_VARS } from './colors';
import { formatCurrency, formatDate } from '../../data/format';

interface LeadJourneyModalProps {
  lead: EnrichedLead;
  onClose: () => void;
}

function journeyDays(lead: EnrichedLead): number | null {
  if (lead.status_history.length < 2) return null;
  const first = new Date(lead.status_history[0].timestamp).getTime();
  const last = new Date(lead.status_history[lead.status_history.length - 1].timestamp).getTime();
  return Math.round((last - first) / (24 * 60 * 60 * 1000));
}

export function LeadJourneyModal({ lead, onClose }: LeadJourneyModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const days = journeyDays(lead);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="lead-journey"
        role="dialog"
        aria-modal="true"
        aria-label={`Lead journey for ${lead.customer_name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="lead-journey__close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="lead-journey__header">
          <div className="lead-journey__title">Lead Journey</div>
          <div className="lead-journey__subtitle">
            {lead.customer_name} · <span className="lead-id">{lead.id}</span>
          </div>
          <div className="lead-journey__meta">
            {lead.model_interested} · <span className="deal-value">{formatCurrency(lead.deal_value)}</span>
          </div>
        </div>

        <div className="lead-journey__timeline">
          {lead.status_history.map((entry, i) => (
            <div className="lead-journey-step" key={`${entry.status}-${entry.timestamp}`}>
              <div className="lead-journey-step__marker">
                <span
                  className="lead-journey-step__dot"
                  style={{ '--dot-color': STATUS_COLOR_VARS[entry.status] } as React.CSSProperties}
                />
                {i < lead.status_history.length - 1 && <span className="lead-journey-step__line" />}
              </div>
              <div className="lead-journey-step__body">
                <div className="lead-journey-step__status">{STATUS_LABELS[entry.status]}</div>
                <div className="lead-journey-step__date">{formatDate(entry.timestamp)}</div>
                {entry.note && <div className="lead-journey-step__note">"{entry.note}"</div>}
              </div>
            </div>
          ))}
        </div>

        {days !== null && (
          <div className="lead-journey__footer">
            Total journey: <strong>{days} {days === 1 ? 'day' : 'days'}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
