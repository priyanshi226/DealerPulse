import type { Insight, InsightSeverity } from '../../../analytics/calculations';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { EmptyState } from '../../AnalyticsPage/charts/EmptyState';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  critical: 'High Risk',
  warning: 'Needs Attention',
  opportunity: 'Opportunity',
};

interface ExecutivePrioritiesSectionProps {
  insights: Insight[];
  onFocusEntity?: (insight: Insight) => void;
}

/** The headline summary at the top of Actionable — the handful of issues
 * that matter most right now, each traced back to a real, computed metric
 * (see analytics/calculations/actionable.ts — nothing here is generated text). */
export function ExecutivePrioritiesSection({ insights, onFocusEntity }: ExecutivePrioritiesSectionProps) {
  const top = insights.slice(0, 4);

  return (
    <SectionCard
      title="What needs your attention right now"
      description="The handful of things most worth a look today, ranked by how much money or risk is involved."
      info={
        <InfoTooltip label="How these are picked">
          Every card here comes from a fixed rule checked against your real numbers — never guessed. They're ranked by
          severity first, then by how much revenue is at stake.
        </InfoTooltip>
      }
    >
      {top.length === 0 ? (
        <EmptyState message="Nothing urgent right now — the business is tracking healthy for this filter." />
      ) : (
        <div className="priority-grid">
          {top.map((insight) => (
            <article key={insight.id} className={`priority-card priority-card--${insight.severity}`}>
              <div className="priority-card__head">
                <span className="priority-card__icon">{insight.icon}</span>
                <span className={`priority-card__severity priority-card__severity--${insight.severity}`}>
                  {SEVERITY_LABEL[insight.severity]}
                </span>
              </div>
              <h3 className="priority-card__title">{insight.title}</h3>
              <p className="priority-card__explanation">{insight.explanation}</p>
              <div className="priority-card__metric">
                <span className="priority-card__metric-label">{insight.metricLabel}</span>
                <span className="priority-card__metric-value">{insight.metricValue}</span>
              </div>
              <p className="priority-card__action">
                <strong>What to do:</strong> {insight.recommendedAction}
              </p>
              {onFocusEntity && insight.entityId && (
                <button type="button" className="priority-card__link" onClick={() => onFocusEntity(insight)}>
                  View {insight.entityType} →
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
