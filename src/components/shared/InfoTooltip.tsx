import { useEffect, useRef, useState } from 'react';
import './InfoTooltip.css';

interface InfoTooltipProps {
  /** One short label, e.g. "Capital at Risk" — shown as the popover's heading. */
  label: string;
  /** 1-3 short plain-language sentences: what it means, why it matters, and
   * (only if it genuinely helps) how it's worked out. No jargon, no formulas. */
  children: string;
}

/** A small "ⓘ" for the handful of terms on the page that genuinely need a
 * plain-language explainer — deliberately lightweight (no formula/data-grain
 * fields like the Analytics page's ChartInfoButton) since Actionable's info
 * buttons exist to explain a *concept* in one breath, not to audit a chart's
 * calculation. Use sparingly — most labels don't need one. */
export function InfoTooltip({ label, children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <span className="info-tip" ref={rootRef}>
      <button
        type="button"
        className="info-tip__trigger"
        aria-label={`What does "${label}" mean?`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⓘ
      </button>
      {open && (
        <div className="info-tip__panel" role="tooltip">
          <div className="info-tip__label">{label}</div>
          <p className="info-tip__body">{children}</p>
        </div>
      )}
    </span>
  );
}
