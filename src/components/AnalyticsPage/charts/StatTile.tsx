interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  /** 0-100+ meter fill for bounded metrics (conversion, loss rate, target achievement). */
  meterPct?: number | null;
  tone?: 'neutral' | 'positive' | 'negative';
}

export function StatTile({ label, value, hint, meterPct, tone = 'neutral' }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__label">{label}</div>
      <div className={`stat-tile__value stat-tile__value--${tone}`}>{value}</div>
      {meterPct !== undefined && meterPct !== null && (
        <div className="stat-tile__meter">
          <div
            className={`stat-tile__meter-fill stat-tile__meter-fill--${tone}`}
            style={{ width: `${Math.max(0, Math.min(100, meterPct))}%` }}
          />
        </div>
      )}
      {hint && <div className="stat-tile__hint">{hint}</div>}
    </div>
  );
}
