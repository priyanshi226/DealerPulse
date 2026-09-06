import { useMemo, useRef, useState } from 'react';
import { QUESTIONS } from '../../analytics/questions/catalogue';
import type { NormalizedData } from '../../data/loadData';
import { QuestionCard } from './questions/QuestionCard';
import { QuestionSearch } from './questions/QuestionSearch';
import './QuestionsView.css';

interface QuestionsViewProps {
  data: NormalizedData;
  referenceNowIso: string;
}

export function QuestionsView({ data, referenceNowIso }: QuestionsViewProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimeout = useRef<number | null>(null);

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

  return (
    <div className="questions-page">
      <QuestionSearch questions={QUESTIONS} onSelect={handleSelect} />

      <div className="questions-ask-ai-pointer">
        ✨ Looking for <strong>Ask AI</strong>? It's now on the <strong>Actionable</strong> tab, alongside the priorities and
        recommendations it can reason about.
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
