import { EmptyState } from './EmptyState';

export interface BarChartRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  displayValue: string;
  color?: string;
  flag?: string;
}

interface BarChartProps {
  rows: BarChartRow[];
  emptyMessage?: string;
}

/** Horizontal ranked bar chart — the workhorse for every "compare N
 * categories on one metric" view (breakdowns, performance, aging, losses,
 * velocity, delivery time). Rows are pre-sorted by the caller. */
export function BarChart({ rows, emptyMessage }: BarChartProps) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;

  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="bar-chart">
      {rows.map((row) => (
        <div className="bar-chart__row" key={row.key} title={`${row.label}: ${row.displayValue}`}>
          <div className="bar-chart__label">
            {row.label}
            {row.sublabel && <span className="bar-chart__sublabel">{row.sublabel}</span>}
          </div>
          <div className="bar-chart__track">
            <div
              className="bar-chart__fill"
              style={{ width: `${(Math.max(0, row.value) / max) * 100}%`, background: row.color ?? 'var(--accent)' }}
            />
          </div>
          <div className="bar-chart__value">
            {row.displayValue}
            {row.flag && <span className="bar-chart__flag">{row.flag}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
