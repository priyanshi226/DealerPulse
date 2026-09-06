import type { Branch } from '../../data/types';
import { STATUS_ORDER, STATUS_LABELS } from '../../data/transformations';
import { STATUS_COLOR_VARS, branchColorVar } from './colors';

export function StatusLegend() {
  return (
    <div className="legend">
      <span>Status:</span>
      {STATUS_ORDER.map((status) => (
        <span key={status} className="legend__item">
          <span
            className="legend__swatch"
            style={{ background: STATUS_COLOR_VARS[status] } as React.CSSProperties}
          />
          {STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}

export function BranchLegend({ branches }: { branches: Branch[] }) {
  return (
    <div className="legend">
      <span>Branch:</span>
      {branches.map((branch, index) => (
        <span key={branch.id} className="legend__item">
          <span
            className="legend__swatch"
            style={{ background: branchColorVar(index) } as React.CSSProperties}
          />
          {branch.id} — {branch.name}
        </span>
      ))}
    </div>
  );
}
