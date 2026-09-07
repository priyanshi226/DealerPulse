import { useEffect, useMemo, useRef, useState } from 'react';
import { QUESTIONS } from '../../analytics/questions/catalogue';
import { loadDealershipData } from '../../data/loadData';
import type { NormalizedData } from '../../data/loadData';
import { QuestionCard } from './questions/QuestionCard';
import { QuestionSearch } from './questions/QuestionSearch';
import './QuestionsView.css';

/** A standalone top-level page (its own nav tab) — loads its own data the
 * same way ActionablePage and DataExplorer do, rather than relying on a
 * parent shell, so it can be reached directly instead of being nested a
 * click deeper inside Analytics. */
export function QuestionsView() {
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimeout = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDealershipData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const referenceNowIso = useMemo(() => {
    if (!data || data.leads.length === 0) return new Date().toISOString();
    return data.leads.reduce((max, l) => (l.last_activity_at > max ? l.last_activity_at : max), data.leads[0].last_activity_at);
  }, [data]);

  const categories = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, typeof QUESTIONS>();
    for (const q of QUESTIONS) {
      if (!map.has(q.category)) {
        map.set(q.category, []);
        order.push(q.category);
      }
      map.get(q.category)!.push(q);
    }
    return order.map((category) => ({ category, questions: map.get(category)! }));
  }, []);

  function handleSelect(id: string) {
    const el = cardRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(id);
    if (highlightTimeout.current) window.clearTimeout(highlightTimeout.current);
    highlightTimeout.current = window.setTimeout(() => setHighlightedId(null), 1600);
  }

  if (error) {
    return <div className="state-screen state-screen--error">Couldn't load dealership data: {error}</div>;
  }

  if (!data) {
    return <div className="state-screen">Loading dealership data…</div>;
  }

  return (
    <div className="questions-page">
      <div className="questions-page__intro">
        <h1 className="questions-page__title">What do you want to know?</h1>
        <p className="questions-page__subtitle">
          Pick a question, add filters to make it specific, and get a real answer from your data — no analytics
          background needed.
        </p>
      </div>

      <QuestionSearch questions={QUESTIONS} onSelect={handleSelect} />

      <div className="questions-ask-ai-pointer">
        ✨ Have a question that's not listed? <strong>Ask AI</strong> lives on the <strong>Actionable</strong> tab and can
        answer anything in plain English.
      </div>

      <div className="questions-stack">
        {categories.map(({ category, questions }) => (
          <section key={category} className="questions-category">
            <h2 className="questions-category__title">{category}</h2>
            <div className="questions-category__list">
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  data={data}
                  referenceNowIso={referenceNowIso}
                  highlighted={highlightedId === question.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(question.id, el);
                    else cardRefs.current.delete(question.id);
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
