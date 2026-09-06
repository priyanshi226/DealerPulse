import type { LeadGroup, ViewMode } from '../../data/transformations';
import type { LeadStatus } from '../../data/types';
import { formatCurrency } from '../../data/format';
import { BranchDot } from './BranchTag';
import { STATUS_COLOR_VARS } from './colors';

interface GroupHeaderProps {
  group: LeadGroup;
  viewMode: ViewMode;
  branchIndexById: Map<string, number>;
  collapsed: boolean;
  onToggle: () => void;
  columnCount: number;
}

export function GroupHeader({
  group,
  viewMode,
  branchIndexById,
  collapsed,
  onToggle,
  columnCount,
}: GroupHeaderProps) {
  const totalValue = group.leads.reduce((sum, l) => sum + l.deal_value, 0);

  return (
    <tr className="group-header-row">
      <td colSpan={columnCount}>
        <button type="button" className="group-header" onClick={onToggle}>
          <span className={`group-header__chevron ${collapsed ? 'group-header__chevron--collapsed' : ''}`}>
            ▾
          </span>
          {renderIndicator(group, viewMode, branchIndexById)}
          <span className="group-header__label">{group.label}</span>
          {group.sublabel && <span className="group-header__sublabel">{group.sublabel}</span>}
          <span className="group-header__stats">
            <span className="group-header__count">{group.leads.length} leads</span>
            <span className="group-header__value">{formatCurrency(totalValue)}</span>
          </span>
        </button>
      </td>
    </tr>
  );
}

function renderIndicator(group: LeadGroup, viewMode: ViewMode, branchIndexById: Map<string, number>) {
  if (viewMode === 'status') {
    const status = group.key as LeadStatus;
    return (
      <span
        className="group-header__dot"
        style={{ background: STATUS_COLOR_VARS[status] } as React.CSSProperties}
      />
    );
  }
  if ((viewMode === 'branch' || viewMode === 'salesRep') && group.branchId) {
    const index = branchIndexById.get(group.branchId) ?? 0;
    return <BranchDot branchIndex={index} />;
  }
  return null;
}
