import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { AppView } from '../components/ViewToggle/ViewToggle';
import { WALKTHROUGH_STEPS, type WalkthroughStep } from './steps';
import './Walkthrough.css';

const STORAGE_KEY = 'dealerpulse-walkthrough-completed';

export interface WalkthroughHandle {
  start: () => void;
}

interface WalkthroughProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** A guided tour that actually drives the app: each step can require a
 * specific tab to be showing, and this component calls `onNavigate` to get
 * there before it measures and spotlights the real element — never a
 * fabricated element that isn't currently on screen. Auto-starts once for a
 * first-time visitor (tracked in localStorage); `ref.current.start()` lets
 * the app's own "Replay tour" button re-trigger it any time. */
export const Walkthrough = forwardRef<WalkthroughHandle, WalkthroughProps>(function Walkthrough({ view, onNavigate }, ref) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const step = WALKTHROUGH_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === WALKTHROUGH_STEPS.length - 1;

  useImperativeHandle(ref, () => ({
    start: () => {
      setStepIndex(0);
      setActive(true);
    },
  }));

  // First-time visitors only — never forced on a repeat visit.
  useEffect(() => {
    let completed = false;
    try {
      completed = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // localStorage unavailable (private browsing, etc.) — fine, just won't persist across visits
    }
    if (!completed) {
      const t = window.setTimeout(() => setActive(true), 700);
      return () => window.clearTimeout(t);
    }
  }, []);

  function finish() {
    setActive(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore — nothing to persist to
    }
    if (view !== 'actionable') onNavigate('actionable');
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  // Drive the app to whatever tab this step is about.
  useEffect(() => {
    if (!active) return;
    if (step.view && step.view !== view) onNavigate(step.view);
    // Only the step should trigger navigation, not every `view` change (that
    // would fight the user's own clicks while a step is active).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  // Escape always exits the tour, same as Skip.
  useEffect(() => {
    if (!active) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Once the right tab is showing, scroll to and measure the target element.
  // This effect can re-run twice in quick succession for one step change —
  // once when `stepIndex` updates, again a tick later when `view` actually
  // catches up after `onNavigate` — so any in-flight scroll/measure from a
  // stale run must be fully cancelable, not just its *first* timeout, or a
  // late callback from the previous (wrong) tab can overwrite a correct
  // measurement with coordinates captured before the tab even switched.
  useEffect(() => {
    if (!active || !step.targetId) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let settleTimeout: number | null = null;

    function measure() {
      if (cancelled) return;
      const el = document.getElementById(step.targetId!);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    // Small delay so a tab switch has time to render before we look for the
    // element. The scroll itself is instant (`behavior: 'auto'`), not smooth
    // — on a page a couple thousand pixels tall, native smooth-scrolling can
    // take well over a second, far longer than a short settle delay could
    // ever wait out, which left the spotlight measuring a mid-scroll
    // position. The spotlight/card's own CSS transition (0.35s) is what
    // gives the *visual* glide instead; the underlying scroll just jumps.
    const kickoffTimeout = window.setTimeout(() => {
      if (cancelled) return;
      const el = document.getElementById(step.targetId!);
      el?.scrollIntoView({ behavior: 'auto', block: 'center' });
      settleTimeout = window.setTimeout(measure, 80);
    }, 60);

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelled = true;
      window.clearTimeout(kickoffTimeout);
      if (settleTimeout !== null) window.clearTimeout(settleTimeout);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, stepIndex, view, step.targetId]);

  if (!active) return null;

  return (
    <div className="walkthrough-root">
      <div className="walkthrough-blocker" onClick={(e) => e.stopPropagation()} />
      {rect && (
        <div
          className="walkthrough-spotlight"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      {!rect && <div className="walkthrough-dim" />}
      <WalkthroughCard
        step={step}
        stepNumber={stepIndex + 1}
        total={WALKTHROUGH_STEPS.length}
        anchorRect={rect}
        isFirst={isFirst}
        isLast={isLast}
        onBack={back}
        onNext={next}
        onSkip={finish}
      />
    </div>
  );
});

interface WalkthroughCardProps {
  step: WalkthroughStep;
  stepNumber: number;
  total: number;
  anchorRect: TargetRect | null;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

const CARD_WIDTH = 340;
const VIEWPORT_MARGIN = 16;

function WalkthroughCard({ step, stepNumber, total, anchorRect, isFirst, isLast, onBack, onNext, onSkip }: WalkthroughCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!anchorRect) {
      setStyle({});
      return;
    }
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const estCardHeight = cardRef.current?.offsetHeight ?? 200;

    let top = anchorRect.top + anchorRect.height + VIEWPORT_MARGIN;
    if (top + estCardHeight > viewportH - VIEWPORT_MARGIN) {
      const above = anchorRect.top - estCardHeight - VIEWPORT_MARGIN;
      top = Math.max(VIEWPORT_MARGIN, above);
    }

    let left = anchorRect.left + anchorRect.width / 2 - CARD_WIDTH / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportW - CARD_WIDTH - VIEWPORT_MARGIN));

    setStyle({ position: 'fixed', top, left, width: CARD_WIDTH });
  }, [anchorRect]);

  return (
    <div
      ref={cardRef}
      className={`walkthrough-card${anchorRect ? '' : ' walkthrough-card--centered'}`}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      <div className="walkthrough-card__progress">
        {stepNumber} / {total}
      </div>
      <h2 className="walkthrough-card__title">{step.title}</h2>
      <p className="walkthrough-card__body">{step.body}</p>
      <div className="walkthrough-card__actions">
        <button type="button" className="walkthrough-card__skip" onClick={onSkip}>
          Skip
        </button>
        <div className="walkthrough-card__nav">
          {!isFirst && (
            <button type="button" className="walkthrough-card__back" onClick={onBack}>
              Back
            </button>
          )}
          <button type="button" className="walkthrough-card__next" onClick={onNext}>
            {isLast ? 'Explore DealerPulse' : isFirst ? 'Start walkthrough' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
