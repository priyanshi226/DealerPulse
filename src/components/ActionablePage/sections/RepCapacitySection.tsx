import type { RepCapacityRow } from '../../../analytics/calculations';
import { formatCompactCurrency, formatPercent } from '../../../analytics/format';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { EmptyState } from '../../AnalyticsPage/charts/EmptyState';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';

const LEVEL_META: Record<RepCapacityRow['level'], { icon: string; label: string }> = {
  overloaded: { icon: '🔴', label: 'High Workload' },
  attention: { icon: '🟡', label: 'Needs Workload Review' },
  healthy: { icon: '🟢', label: 'Healthy' },
};

interface RepCapacitySectionProps {
  rows: RepCapacityRow[];
  onViewRep: (repId: string) => void;
}

/** Operational workload signal per rep — active-lead volume relative to
 * peers, not a judgment about the person. Labels stay in "workload" terms
 * (High Workload / Needs Review / Healthy), never psychological ones. */
export function RepCapacitySection({ rows, onViewRep }: RepCapacitySectionProps) {
  const flagged = rows.filter((r) => r.level !== 'healthy');
  const shown = [...flagged, ...rows.filter((r) => r.level === 'healthy')].slice(0, 8);

  return (
    <SectionCard
      title="Rep Capacity"
      description="Who's carrying too much, and who has room to take on more — based on workload, not performance."
      info={
        <InfoTooltip label="Capacity">
          This compares how many open deals each rep is juggling against the team average. A high number doesn't mean a
          rep is doing badly — it just means they may need help or a lighter load.
        </InfoTooltip>
      }
    >
      {shown.length === 0 ? (
        <EmptyState message="No rep activity in the current filters." />
      ) : (
        <div className="rep-capacity-list">
          {shown.map((row) => {
            const meta = LEVEL_META[row.level];
            return (
              <div key={row.repId} className={`rep-capacity-row rep-capacity-row--${row.level}`}>
                <span className="rep-capacity-row__icon">{meta.icon}</span>
                <div className="rep-capacity-row__body">
                  <div className="rep-capacity-row__head">
                    <strong>{row.repName}</strong>
                    <span className="rep-capacity-row__branch">{row.branchName}</span>
                    <span className={`rep-capacity-row__level rep-capacity-row__level--${row.level}`}>{meta.label}</span>
                  </div>
                  <div className="rep-capacity-row__stats">
                    <span>{row.activeLeads} active deals</span>
                    {row.stagnantLeads > 0 && <span>{row.stagnantLeads} gone quiet</span>}
                    <span>{formatCompactCurrency(row.pipelineValue)} pipeline</span>
                    <span>{row.conversionPct === null ? '— conv.' : `${formatPercent(row.conversionPct, 1)} conv.`}</span>
                  </div>
                </div>
                <button type="button" className="rep-capacity-row__link" onClick={() => onViewRep(row.repId)}>
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
