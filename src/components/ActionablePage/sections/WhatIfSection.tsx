import { useMemo, useState } from 'react';
import { calculateWhatIf, calculateWhatIfBaseline } from '../../../analytics/calculations';
import type { WhatIfLever } from '../../../analytics/calculations';
import { formatCompactCurrency } from '../../../analytics/format';
import type { EnrichedLead } from '../../../data/types';
import { InfoTooltip } from '../../shared/InfoTooltip';
import { SectionCard } from '../../AnalyticsPage/charts/SectionCard';
import { SegmentedControl } from '../../AnalyticsPage/charts/SegmentedControl';

interface WhatIfSectionProps {
  filteredLeads: EnrichedLead[];
  referenceNowIso: string;
}

const LEVERS: { value: WhatIfLever; label: string }[] = [
  { value: 'conversion', label: 'Conversion rate' },
  { value: 'reactivate', label: 'Reactivate quiet deals' },
  { value: 'dealValue', label: 'Average deal value' },
];

const LEVER_CONFIG: Record<WhatIfLever, { min: number; max: number; step: number; unit: string; question: (n: number) => string }> = {
  conversion: { min: 1, max: 15, step: 1, unit: 'pts', question: (n) => `What if conversion improves by ${n} points?` },
  reactivate: { min: 1, max: 30, step: 1, unit: 'deals', question: (n) => `What if we win back ${n} deals that have gone quiet?` },
  dealValue: { min: 1, max: 20, step: 1, unit: '%', question: (n) => `What if average deal value rises by ${n}%?` },
};

/** A deterministic scenario calculator — see analytics/calculations/whatIf.ts.
 * No Gemini call here: the arithmetic is simple enough to show its work
 * directly in the UI, which is more trustworthy than routing a projection
 * through an LLM that could just as easily invent a plausible-sounding number. */
export function WhatIfSection({ filteredLeads, referenceNowIso }: WhatIfSectionProps) {
  const [lever, setLever] = useState<WhatIfLever>('conversion');
  const [amount, setAmount] = useState(5);

  const baseline = useMemo(() => calculateWhatIfBaseline(filteredLeads, referenceNowIso), [filteredLeads, referenceNowIso]);
  const config = LEVER_CONFIG[lever];
  const clampedAmount = Math.min(config.max, Math.max(config.min, amount));
  const result = useMemo(() => calculateWhatIf(baseline, lever, clampedAmount), [baseline, lever, clampedAmount]);

  function handleLeverChange(next: WhatIfLever) {
    setLever(next);
    setAmount(LEVER_CONFIG[next].min === 1 ? 5 : LEVER_CONFIG[next].min);
  }

  return (
    <SectionCard
      title="What could change if..."
      description="Try a scenario and see the projected impact, calculated from your real numbers — not a guess."
      info={
        <InfoTooltip label="What-If Projection">
          This is a projection, not a promise. It applies a simple, clearly-stated assumption to your actual current
          numbers — it never invents a number on its own.
        </InfoTooltip>
      }
      controls={<SegmentedControl value={lever} onChange={handleLeverChange} options={LEVERS} />}
    >
      {!result ? (
        <p className="whatif-empty">Not enough data in this filter to run a projection.</p>
      ) : (
        <div className="whatif">
          <div className="whatif__question">{config.question(clampedAmount)}</div>

          <input
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={clampedAmount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="whatif__slider"
            aria-label={LEVERS.find((l) => l.value === lever)?.label}
          />
          <div className="whatif__slider-scale">
            <span>
              {config.min}
              {config.unit}
            </span>
            <span>
              {config.max}
              {config.unit}
            </span>
          </div>

          <div className="whatif__flow">
            <div className="whatif__flow-step">
              <span className="whatif__flow-label">Current</span>
              <span className="whatif__flow-value">{result.currentValue}</span>
            </div>
            <span className="whatif__flow-arrow">→</span>
            <div className="whatif__flow-step">
              <span className="whatif__flow-label">Scenario</span>
              <span className="whatif__flow-value">{result.scenarioValue}</span>
            </div>
            <span className="whatif__flow-arrow">→</span>
            <div className="whatif__flow-step whatif__flow-step--impact">
              <span className="whatif__flow-label">Estimated extra revenue</span>
              <span className="whatif__flow-value whatif__flow-value--impact">
                +{formatCompactCurrency(result.additionalRevenue)}
              </span>
            </div>
          </div>

          <p className="whatif__note">{result.note} This is a projection based on today's numbers, not a guarantee.</p>
        </div>
      )}
    </SectionCard>
  );
}
