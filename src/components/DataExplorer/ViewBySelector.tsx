import { VIEW_MODES, type ViewMode } from '../../data/transformations';

interface ViewBySelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewBySelector({ value, onChange }: ViewBySelectorProps) {
  return (
    <div className="view-by">
      <span className="view-by__label">View By</span>
      <div className="segmented">
        {VIEW_MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            className={`segmented__item${mode === value ? ' segmented__item--active' : ''}`}
            onClick={() => onChange(mode)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
