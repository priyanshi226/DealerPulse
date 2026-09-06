import { EmptyState } from './EmptyState';

export interface LineChartPoint {
  key: string;
  label: string;
  value: number | null;
  /** Rendered as a hollow, lighter point — data that hasn't fully matured yet. */
  provisional?: boolean;
}

interface LineChartProps {
  points: LineChartPoint[];
  formatValue: (value: number) => string;
  emptyMessage?: string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

export function LineChart({ points, formatValue, emptyMessage }: LineChartProps) {
  const withValues = points.filter((p): p is LineChartPoint & { value: number } => p.value !== null);
  if (points.length === 0 || withValues.length === 0) return <EmptyState message={emptyMessage} />;

  const maxVal = Math.max(0, ...withValues.map((p) => p.value));
  const domainMax = maxVal === 0 ? 1 : maxVal * 1.15;
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) => PAD_LEFT + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const yFor = (v: number) => PAD_TOP + innerH - (v / domainMax) * innerH;

  // Build the path, breaking into separate segments across any null gaps.
  const segments: string[] = [];
  let current: string | null = null;
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current) segments.push(current);
      current = null;
      return;
    }
    const cmd = `${xFor(i)},${yFor(p.value)}`;
    current = current ? `${current} L ${cmd}` : `M ${cmd}`;
  });
  if (current) segments.push(current);

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="line-chart__svg" role="img" aria-label="Trend chart">
        {gridSteps.map((step) => {
          const y = PAD_TOP + innerH - step * innerH;
          return (
            <line key={step} x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y} y2={y} className="line-chart__gridline" />
          );
        })}
        {gridSteps.map((step) => {
          const y = PAD_TOP + innerH - step * innerH;
          return (
            <text key={`label-${step}`} x={PAD_LEFT} y={y - 4} className="line-chart__gridlabel">
              {formatValue(step * domainMax)}
            </text>
          );
        })}
        {segments.map((d, i) => (
          <path key={i} d={d} className="line-chart__path" />
        ))}
        {points.map((p, i) => {
          if (p.value === null) return null;
          const cx = xFor(i);
          const cy = yFor(p.value);
          return (
            <circle
              key={p.key}
              cx={cx}
              cy={cy}
              r={p.provisional ? 3.5 : 4.5}
              className={`line-chart__dot${p.provisional ? ' line-chart__dot--provisional' : ''}`}
            >
              <title>
                {p.label}: {formatValue(p.value)}
                {p.provisional ? ' (still maturing — provisional)' : ''}
              </title>
            </circle>
          );
        })}
        {points.map((p, i) => (
          <text key={`x-${p.key}`} x={xFor(i)} y={HEIGHT - 8} textAnchor="middle" className="line-chart__xlabel">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
