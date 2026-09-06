import type { Insight } from '../../../analytics/calculations';
import { EmptyState } from '../../AnalyticsPage/charts/EmptyState';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';

interface BottlenecksSectionProps {
  insights: Insight[];
  onFocusEntity?: (insight: Insight) => void;
}

/** The full, ranked breakdown behind the headline priorities — one row per
 * detected issue, in the "what / why it matters / who's affected / what to do"
 * shape the business actually needs to act on rather than just read. */
export function BottlenecksSection({ insights, onFocusEntity }: BottlenecksSectionProps) {
  return (
    <SectionCard
      title="The full list, in order of impact"
      description="Same issues as above, but with the full story — what's happening, who it affects, and what to do about it."
    >
      {insights.length === 0 ? (
        <EmptyState message="Nothing flagged for the current filters." />
      ) : (
        <ol className="bottleneck-list">
          {insights.map((insight, i) => (
            <li key={insight.id} className="bottleneck-row">
              <span className="bottleneck-row__rank">{i + 1}</span>
              <div className="bottleneck-row__body">
                <div className="bottleneck-row__headline">
                  <span className="bottleneck-row__icon">{insight.icon}</span>
                  <strong>{insight.title}</strong>
                  {insight.financialImpact !== null && (
                    <span className="bottleneck-row__impact">{insight.metricValue}</span>
                  )}
                </div>
                <p className="bottleneck-row__why">{insight.explanation}</p>
                <div className="bottleneck-row__footer">
                  <span className="bottleneck-row__who">
                    Affects: <strong>{insight.entityLabel}</strong>
                  </span>
                  <span className="bottleneck-row__action">→ {insight.recommendedAction}</span>
                </div>
              </div>
              {onFocusEntity && insight.entityId && (
                <button type="button" className="bottleneck-row__link" onClick={() => onFocusEntity(insight)}>
                  View
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
