interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

/** Generic toggle used for every "break down by" / metric control on the
 * Analytics page — reuses the app's existing `.segmented` styling so it reads
 * as the same control language as the Table page's View By selector. */
export function SegmentedControl<T extends string>({ value, options, onChange, size = 'sm' }: SegmentedControlProps<T>) {
  return (
    <div className={`segmented analytics-segmented${size === 'sm' ? ' analytics-segmented--sm' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`segmented__item${opt.value === value ? ' segmented__item--active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
