export type AnalyticsMode = 'questions' | 'charts';

interface AnalyticsModeToggleProps {
  value: AnalyticsMode;
  onChange: (mode: AnalyticsMode) => void;
}

const MODES: { value: AnalyticsMode; label: string }[] = [
  { value: 'questions', label: 'Questions' },
  { value: 'charts', label: 'Charts' },
];

export function AnalyticsModeToggle({ value, onChange }: AnalyticsModeToggleProps) {
  return (
    <div className="segmented analytics-mode-toggle" role="tablist" aria-label="Analytics mode">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          role="tab"
          aria-selected={mode.value === value}
          className={`segmented__item${mode.value === value ? ' segmented__item--active' : ''}`}
          onClick={() => onChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
