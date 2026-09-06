import type { QuestionAnswer, QuestionDefinition } from '../../../analytics/questions/types';

interface QuestionAnswerViewProps {
  question: QuestionDefinition;
  answer: QuestionAnswer;
}

export function QuestionAnswerView({ question, answer }: QuestionAnswerViewProps) {
  if (answer.kind === 'empty') {
    return <div className="q-answer q-answer--empty">{answer.emptyReason}</div>;
  }

  if (answer.kind === 'single') {
    return (
      <div className="q-answer">
        <div className="q-answer__value">{answer.value}</div>
        {question.unitLabel && <div className="q-answer__unit">{question.unitLabel}</div>}
      </div>
    );
  }

  if (answer.kind === 'ranking') {
    return (
      <div className="q-answer">
        <div className="q-answer__ranking-label">{answer.rankingLabel}</div>
        <div className="q-answer__value q-answer__value--ranking">{answer.value}</div>
      </div>
    );
  }

  if ((answer.kind === 'breakdown' || answer.kind === 'list') && answer.rows) {
    return (
      <div className="q-answer q-answer--rows">
        {answer.rows.map((row) => (
          <div className="q-answer-row" key={row.key}>
            <span className="q-answer-row__label">{row.label}</span>
            <span className="q-answer-row__value">
              {row.value}
              {row.flag && <span className="q-answer-row__flag">{row.flag}</span>}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
