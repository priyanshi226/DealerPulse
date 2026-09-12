import { useState } from 'react';
import type { Insight } from '../../../analytics/calculations';
import { EmptyState } from '../../AnalyticsPage/charts/EmptyState';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';

interface BottlenecksSectionProps {
  insights: Insight[];
  onFocusEntity?: (insight: Insight) => void;
}

const COLLAPSED_COUNT = 3;

/** The full, ranked breakdown behind the headline priorities — one row per
 * detected issue, in the "what / why it matters / who's affected / what to do"
 * shape the business actually needs to act on rather than just read. Collapsed
 * to a handful of rows by default since it otherwise repeats the priority
 * cards above at length — the rest is a click away, not a scroll away. */
export function BottlenecksSection({ insights, onFocusEntity }: BottlenecksSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? insights : insights.slice(0, COLLAPSED_COUNT);

  return (
    <SectionCard
      title="The full list, in order of impact"
      description="Same issues as above, but with the full story — what's happening, who it affects, and what to do about it."
      controls={
        insights.length > COLLAPSED_COUNT ? (
          <button type="button" className="bottleneck-row__link" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `Show all ${insights.length}`}
          </button>
        ) : undefined
      }
    >
      {insights.length === 0 ? (
        <EmptyState message="Nothing flagged for the current filters." />
      ) : (
        <ol className="bottleneck-list">
          {visible.map((insight, i) => (
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
