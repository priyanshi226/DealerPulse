export type AppView = 'actionable' | 'analytics' | 'questions' | 'table';

interface ViewToggleProps {
  value: AppView;
  onChange: (view: AppView) => void;
}

// Exactly three primary views, in the order the product story reads:
// Actionable ("what should I do?") first since it's the default landing
// page, then Analytics ("what's happening?"), then Questions ("ask
// anything"). Table (row-level data) is a real, useful view but isn't one
// of the three the product is organized around — it gets a quieter,
// visually secondary link instead of equal billing in the segmented control,
// so the primary nav stays exactly three items as intended.
const PRIMARY_VIEWS: { key: AppView; label: string }[] = [
  { key: 'actionable', label: 'Actionable' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'questions', label: 'Questions' },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="app-nav">
      <div className="app-toggle segmented" role="tablist" aria-label="Primary view">
        {PRIMARY_VIEWS.map(({ key, label }) => (
          <button
            key={key}
            id={`nav-${key}`}
            type="button"
            role="tab"
            aria-selected={key === value}
            className={`segmented__item${key === value ? ' segmented__item--active' : ''}`}
            onClick={() => onChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        id="nav-table"
        type="button"
        className={`app-nav__secondary${value === 'table' ? ' app-nav__secondary--active' : ''}`}
        onClick={() => onChange('table')}
      >
        Raw data
      </button>
    </div>
  );
}
