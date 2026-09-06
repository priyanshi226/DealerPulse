import { EmptyState } from './EmptyState';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  formatValue: (value: number) => string;
  emptyMessage?: string;
}

const SIZE = 168;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Part-to-whole composition for a small number of categories. Renders an
 * SVG ring (each slice its own stroked circle segment, so it keeps a native
 * hover tooltip) plus a legend — donuts always ship a legend since color
 * alone is never the only identity channel. */
export function DonutChart({ slices, formatValue, emptyMessage }: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return <EmptyState message={emptyMessage} />;

  const segments = slices
    .filter((s) => s.value > 0)
    .reduce<Array<DonutSlice & { dash: number; offset: number; fraction: number }>>((acc, s) => {
      const fraction = s.value / total;
      const dash = fraction * CIRCUMFERENCE;
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      acc.push({ ...s, dash, offset, fraction });
      return acc;
    }, []);

  return (
    <div className="donut-chart">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="donut-chart__svg" role="img" aria-label="Composition chart">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          >
            <title>
              {s.label}: {formatValue(s.value)} ({Math.round(s.fraction * 100)}%)
            </title>
          </circle>
        ))}
        <text x={SIZE / 2} y={SIZE / 2 - 6} textAnchor="middle" className="donut-chart__total-value">
          {formatValue(total)}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="donut-chart__total-label">
          Total
        </text>
      </svg>
      <div className="donut-chart__legend">
        {segments.map((s) => (
          <div key={s.key} className="donut-chart__legend-item">
            <span className="donut-chart__swatch" style={{ background: s.color }} />
            <span className="donut-chart__legend-label">{s.label}</span>
            <span className="donut-chart__legend-value">
              {formatValue(s.value)} · {Math.round(s.fraction * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
