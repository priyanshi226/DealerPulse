import { useEffect, useMemo, useRef, useState } from 'react';
import type { QuestionDefinition } from '../../../analytics/questions/types';

interface QuestionSearchProps {
  questions: QuestionDefinition[];
  onSelect: (id: string) => void;
}

export function QuestionSearch({ questions, onSelect }: QuestionSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return questions
      .filter(
        (question) =>
          question.question.toLowerCase().includes(q) ||
          question.category.toLowerCase().includes(q) ||
          question.id.toLowerCase().includes(q) ||
          (question.description ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, questions]);

  function select(id: string) {
    setOpen(false);
    setQuery('');
    onSelect(id);
  }

  return (
    <div className="q-search" ref={rootRef}>
      <span className="q-search__icon" aria-hidden>
        ⌕
      </span>
      <input
        type="text"
        placeholder="Search questions… (e.g. conversion, revenue, delivery, target, lost)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {query && (
        <button type="button" className="q-search__clear" aria-label="Clear search" onClick={() => setQuery('')}>
          ×
        </button>
      )}
      {open && query && (
        <div className="q-search__panel">
          {results.length === 0 && <div className="q-search__empty">No matching questions</div>}
          {results.map((question) => (
            <button key={question.id} type="button" className="q-search__result" onClick={() => select(question.id)}>
              <span className="q-search__result-question">{question.question}</span>
              <span className="q-search__result-category">{question.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
