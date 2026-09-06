import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buildFilterContext } from '../../../analytics/chartInfo/filterContext';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';

interface ChartInfoButtonProps {
  info: ChartInfo;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

/** The ⓘ trigger + popover shown on every chart card. Never recomputes
 * anything itself — `info` carries the static narrative (formula, grain,
 * date basis) plus whatever numbers the section already calculated, so the
 * panel can never say something different from the chart beside it. */
export function ChartInfoButton({ info, filters, filterOptions }: ChartInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const filterRows = buildFilterContext(info.relevantFilters, filters, filterOptions);

  return (
    <div className="chart-info" ref={rootRef}>
      <button
        type="button"
        className="chart-info__trigger"
        aria-label={`About: ${info.title}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⓘ
      </button>
      {open && (
        <div className="chart-info__panel" role="dialog" aria-label={`${info.title} — details`}>
          <div className="chart-info__header">
            <span>{info.title}</span>
            <span className="chart-info__chart-type">{info.chartType}</span>
          </div>
          <p className="chart-info__desc">{info.description}</p>

          <InfoBlock label="Data grain">{info.dataGrain}</InfoBlock>
          <InfoBlock label="Date basis">{info.dateSemantics}</InfoBlock>
          <InfoBlock label="Calculation">
            <code className="chart-info__formula">{info.formula}</code>
          </InfoBlock>

          {filterRows.length > 0 && (
            <InfoBlock label="Filter context">
              <div className="chart-info__rows">
                {filterRows.map((row) => (
                  <div className="chart-info__row" key={row.key}>
                    <span className="chart-info__row-label">{row.label}</span>
                    <span className="chart-info__row-value">{row.value}</span>
                  </div>
                ))}
              </div>
            </InfoBlock>
          )}

          {info.recordsIncluded !== undefined && (
            <InfoBlock label="Records included">
              {info.recordsIncluded.toLocaleString('en-IN')} {info.recordsLabel}
            </InfoBlock>
          )}

          {info.values && info.values.length > 0 && (
            <InfoBlock label="Values shown">
              <div className="chart-info__rows">
                {info.values.map((v) => (
                  <div className="chart-info__row" key={v.label}>
                    <span className="chart-info__row-label">{v.label}</span>
                    <span className="chart-info__row-value">{v.value}</span>
                  </div>
                ))}
              </div>
            </InfoBlock>
          )}

          {info.interpretation && <InfoBlock label="Interpretation">{info.interpretation}</InfoBlock>}

          {info.caveat && <p className="chart-info__caveat">{info.caveat}</p>}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="chart-info__block">
      <div className="chart-info__label">{label}</div>
      <div className="chart-info__value">{children}</div>
    </div>
  );
}
