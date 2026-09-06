import { EmptyState } from './EmptyState';

export interface GroupedColumnRow {
  key: string;
  label: string;
  actual: number;
  target: number;
}

interface GroupedColumnChartProps {
  rows: GroupedColumnRow[];
  formatValue: (value: number) => string;
  emptyMessage?: string;
}

/** Paired columns (Actual vs Target) per category — the one place on this
 * page with two series, so it's the one chart that carries a legend. */
export function GroupedColumnChart({ rows, formatValue, emptyMessage }: GroupedColumnChartProps) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;

  const max = Math.max(1, ...rows.flatMap((r) => [r.actual, r.target]));

  return (
    <div className="grouped-chart">
      <div className="grouped-chart__legend">
        <span className="grouped-chart__legend-item">
          <span className="grouped-chart__swatch grouped-chart__swatch--actual" /> Actual
        </span>
        <span className="grouped-chart__legend-item">
          <span className="grouped-chart__swatch grouped-chart__swatch--target" /> Target
        </span>
      </div>
      <div className="grouped-chart__plot">
        {rows.map((row) => (
          <div className="grouped-chart__group" key={row.key}>
            <div className="grouped-chart__bars">
              <div
                className="grouped-chart__bar grouped-chart__bar--actual"
                style={{ height: `${(row.actual / max) * 100}%` }}
                title={`${row.label} — Actual: ${formatValue(row.actual)}`}
              />
              <div
                className="grouped-chart__bar grouped-chart__bar--target"
                style={{ height: `${(row.target / max) * 100}%` }}
                title={`${row.label} — Target: ${formatValue(row.target)}`}
              />
            </div>
            <div className="grouped-chart__label">{row.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
