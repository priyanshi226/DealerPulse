export type AppView = 'analytics' | 'actionable' | 'table';

interface ViewToggleProps {
  value: AppView;
  onChange: (view: AppView) => void;
}

const VIEWS: { key: AppView; label: string }[] = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'actionable', label: 'Actionable' },
  { key: 'table', label: 'Table' },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="app-toggle segmented" role="tablist" aria-label="Workspace view">
      {VIEWS.map(({ key, label }) => (
        <button
          key={key}
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
  );
}
