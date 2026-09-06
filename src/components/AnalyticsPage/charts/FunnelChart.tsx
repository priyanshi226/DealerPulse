import type { FunnelResult } from '../../../analytics/calculations';
import { EmptyState } from './EmptyState';

interface FunnelChartProps {
  result: FunnelResult;
  emptyMessage?: string;
}

export function FunnelChart({ result, emptyMessage }: FunnelChartProps) {
  const topCount = result.stages[0]?.reachedCount ?? 0;
  if (topCount === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="funnel-chart">
      {result.stages.map((stage, i) => {
        const isWorstTransition = result.largestDropOff?.toLabel === stage.label;
        return (
          <div key={stage.status} className="funnel-chart__stage">
            {i > 0 && stage.conversionFromPrevPct !== null && (
              <div className={`funnel-chart__transition${isWorstTransition ? ' funnel-chart__transition--worst' : ''}`}>
                {stage.conversionFromPrevPct.toFixed(0)}% advanced · {stage.dropOffFromPrevPct?.toFixed(0)}% drop-off
              </div>
            )}
            <div className="funnel-chart__bar-row">
              <div className="funnel-chart__label">{stage.label}</div>
              <div className="funnel-chart__track">
                <div
                  className="funnel-chart__fill"
                  style={{ width: `${Math.max(4, (stage.reachedCount / topCount) * 100)}%` }}
                  title={`${stage.label}: ${stage.reachedCount.toLocaleString('en-IN')} leads reached this stage`}
                >
                  <span className="funnel-chart__fill-count">{stage.reachedCount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {result.largestDropOff && (
        <p className="funnel-chart__note">
          Largest drop-off: <strong>{result.largestDropOff.fromLabel} → {result.largestDropOff.toLabel}</strong> (
          {result.largestDropOff.dropOffPct.toFixed(0)}% didn't advance)
        </p>
      )}
    </div>
  );
}
