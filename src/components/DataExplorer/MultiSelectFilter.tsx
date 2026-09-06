import { useEffect, useRef, useState } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function toggleValue(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="multiselect" ref={rootRef}>
      <button
        type="button"
        className={`multiselect__trigger ${selected.length ? 'multiselect__trigger--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {selected.length > 0 && <span className="multiselect__count">{selected.length}</span>}
        <span className="multiselect__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="multiselect__panel">
          {options.length === 0 && <div className="multiselect__empty">No options</div>}
          {options.map((opt) => (
            <label key={opt.value} className="multiselect__option">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggleValue(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
