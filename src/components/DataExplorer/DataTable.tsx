import { useMemo, useState } from 'react';
import type { LeadGroup, SortField, SortState, ViewMode } from '../../data/transformations';
import { SOURCE_LABELS } from '../../data/transformations';
import type { EnrichedLead } from '../../data/types';
import { formatCurrency, formatDate, formatRelative } from '../../data/format';
import { BranchTag } from './BranchTag';
import { StatusBadge } from './StatusBadge';
import { GroupHeader } from './GroupHeader';

interface Column {
  key: string;
  label: string;
  sortField?: SortField;
  align?: 'right';
  hideForViewMode?: ViewMode;
}

const COLUMNS: Column[] = [
  { key: 'id', label: 'Lead ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'branch', label: 'Branch', sortField: 'branchName', hideForViewMode: 'branch' },
  { key: 'rep', label: 'Sales Rep', sortField: 'repName', hideForViewMode: 'salesRep' },
  { key: 'source', label: 'Source', hideForViewMode: 'source' },
  { key: 'model', label: 'Model', hideForViewMode: 'model' },
  { key: 'status', label: 'Status', sortField: 'status', hideForViewMode: 'status' },
  { key: 'created', label: 'Created', sortField: 'created_at' },
  { key: 'lastActivity', label: 'Last Activity', sortField: 'last_activity_at' },
  { key: 'expectedClose', label: 'Expected Close', sortField: 'expected_close_date' },
  { key: 'dealValue', label: 'Deal Value', sortField: 'deal_value', align: 'right' },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100];

interface DataTableProps {
  groups: LeadGroup[];
  showGroupHeaders: boolean;
  viewMode: ViewMode;
  sort: SortState;
  onSortChange: (field: SortField) => void;
  branchIndexById: Map<string, number>;
  referenceNowIso: string;
  onSelectLead: (lead: EnrichedLead) => void;
}

export function DataTable({
  groups,
  showGroupHeaders,
  viewMode,
  sort,
  onSortChange,
  branchIndexById,
  referenceNowIso,
  onSelectLead,
}: DataTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const columns = useMemo(() => COLUMNS.filter((c) => c.hideForViewMode !== viewMode), [viewMode]);

  const flatLeads = useMemo(() => groups.flatMap((g) => g.leads), [groups]);
  const totalPages = Math.max(1, Math.ceil(flatLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  if (flatLeads.length === 0) {
    return <EmptyState />;
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // "All Leads" is one giant flat group: paginate by row count.
  // Grouped views keep every group intact (never split across pages) and
  // rely on collapse instead, so the business grouping stays legible.
  const visibleGroups = showGroupHeaders
    ? groups
    : [{ ...groups[0], leads: flatLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize) }];

  return (
    <div className="data-table-wrap">
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === 'right' ? 'col-right' : ''}
                  onClick={col.sortField ? () => onSortChange(col.sortField!) : undefined}
                  data-sortable={col.sortField ? 'true' : undefined}
                >
                  {col.label}
                  {col.sortField && (
                    <span className="sort-indicator">
                      {sort.field === col.sortField ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map((group) => (
              <GroupBody
                key={group.key}
                group={group}
                showHeader={showGroupHeaders}
                viewMode={viewMode}
                branchIndexById={branchIndexById}
                collapsed={collapsed.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
                columns={columns}
                referenceNowIso={referenceNowIso}
                onSelectLead={onSelectLead}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!showGroupHeaders && (
        <div className="table-pagination">
          <div className="table-pagination__size">
            Rows per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="table-pagination__info">
            {flatLeads.length === 0
              ? '0 leads'
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, flatLeads.length)} of ${flatLeads.length}`}
          </div>
          <div className="table-pagination__nav">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupBody({
  group,
  showHeader,
  viewMode,
  branchIndexById,
  collapsed,
  onToggle,
  columns,
  referenceNowIso,
  onSelectLead,
}: {
  group: LeadGroup;
  showHeader: boolean;
  viewMode: ViewMode;
  branchIndexById: Map<string, number>;
  collapsed: boolean;
  onToggle: () => void;
  columns: Column[];
  referenceNowIso: string;
  onSelectLead: (lead: EnrichedLead) => void;
}) {
  return (
    <>
      {showHeader && (
        <GroupHeader
          group={group}
          viewMode={viewMode}
          branchIndexById={branchIndexById}
          collapsed={collapsed}
          onToggle={onToggle}
          columnCount={columns.length}
        />
      )}
      {!collapsed &&
        group.leads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            columns={columns}
            branchIndexById={branchIndexById}
            referenceNowIso={referenceNowIso}
            onSelectLead={onSelectLead}
          />
        ))}
    </>
  );
}

function LeadRow({
  lead,
  columns,
  branchIndexById,
  referenceNowIso,
  onSelectLead,
}: {
  lead: EnrichedLead;
  columns: Column[];
  branchIndexById: Map<string, number>;
  referenceNowIso: string;
  onSelectLead: (lead: EnrichedLead) => void;
}) {
  const cellByKey: Record<string, React.ReactNode> = {
    id: <span className="lead-id">{lead.id}</span>,
    customer: lead.customer_name,
    branch: <BranchTag label={lead.branchName} branchIndex={branchIndexById.get(lead.branch_id) ?? 0} />,
    rep: (
      <span className="rep-cell">
        <span className="rep-cell__name">{lead.repName}</span>
      </span>
    ),
    source: SOURCE_LABELS[lead.source] ?? lead.source,
    model: lead.model_interested,
    status: <StatusBadge status={lead.status} />,
    created: formatDate(lead.created_at),
    lastActivity: (
      <span title={formatDate(lead.last_activity_at)}>{formatRelative(lead.last_activity_at, referenceNowIso)}</span>
    ),
    expectedClose: formatDate(lead.expected_close_date),
    dealValue: <span className="deal-value">{formatCurrency(lead.deal_value)}</span>,
  };

  return (
    <tr
      className="lead-row lead-row--clickable"
      tabIndex={0}
      role="button"
      onClick={() => onSelectLead(lead)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectLead(lead);
        }
      }}
    >
      {columns.map((col) => (
        <td key={col.key} className={col.align === 'right' ? 'col-right' : ''}>
          {cellByKey[col.key]}
        </td>
      ))}
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state__title">No leads match your filters</div>
      <div className="empty-state__hint">Try widening the date range or clearing a filter.</div>
    </div>
  );
}
