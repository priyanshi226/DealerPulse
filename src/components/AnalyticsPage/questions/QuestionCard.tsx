import { forwardRef, useMemo, useState } from 'react';
import { calculateQuestion } from '../../../analytics/questions/engine';
import { deriveQuestionFilterOptions, EMPTY_QUESTION_FILTERS, sanitizeQuestionFilters } from '../../../analytics/questions/filters';
import type { QuestionFilterState } from '../../../analytics/questions/filters';
import { generateQuestionText } from '../../../analytics/questions/phrasing';
import type { QuestionDefinition } from '../../../analytics/questions/types';
import type { NormalizedData } from '../../../data/loadData';
import { QuestionAnswerView } from './QuestionAnswerView';
import { QuestionFilterChips } from './QuestionFilterChips';
import { QuestionFilters } from './QuestionFilters';

interface QuestionCardProps {
  question: QuestionDefinition;
  data: NormalizedData;
  referenceNowIso: string;
  highlighted: boolean;
}

/** Every question card owns its filter state independently — there is no
 * shared/global `selectedFilters` anywhere above this component. Selecting a
 * branch here can never affect any other card, because "here" is exactly
 * where that state lives (see the brief: "filter state must be keyed by
 * question id" — keying it by mounting one independent `useState` per card
 * achieves the same isolation without needing a manually-keyed dictionary). */
export const QuestionCard = forwardRef<HTMLDivElement, QuestionCardProps>(function QuestionCard(
  { question, data, referenceNowIso, highlighted },
  ref,
) {
  const [filters, setFilters] = useState<QuestionFilterState>(EMPTY_QUESTION_FILTERS);

  function handleFiltersChange(next: QuestionFilterState) {
    setFilters(sanitizeQuestionFilters(next, data.raw));
  }

  const filterOptions = useMemo(() => deriveQuestionFilterOptions(data.raw, filters), [data, filters]);

  // The displayed question is derived fresh from the stored base template +
  // this card's own filters on every render — `question.question` itself is
  // never overwritten, so removing a filter naturally falls back to the
  // right in-between phrasing (or the original text once every filter is gone).
  const displayQuestion = useMemo(() => generateQuestionText(question, filters, data.raw), [question, filters, data.raw]);

  // The same `filters` driving the displayed text is what the calculation
  // actually queries with — the text and the answer can never disagree.
  const answer = useMemo(
    () => calculateQuestion(question, data.raw, data.leads, filters, referenceNowIso),
    [question, data, filters, referenceNowIso],
  );

  return (
    <div ref={ref} id={`question-${question.id}`} className={`q-card${highlighted ? ' q-card--highlight' : ''}`}>
      <div className="q-card__category">{question.category}</div>
      <h3 className="q-card__question">{displayQuestion}</h3>
      {question.supportedFilters.length > 0 && (
        <>
          <QuestionFilters supported={question.supportedFilters} filters={filters} options={filterOptions} onChange={handleFiltersChange} />
          <QuestionFilterChips filters={filters} options={filterOptions} onChange={handleFiltersChange} />
        </>
      )}
      <QuestionAnswerView question={question} answer={answer} />
    </div>
  );
});
