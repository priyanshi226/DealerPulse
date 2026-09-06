import raw from '../../data/analyticsQuestions.json';
import type { QuestionCatalogue } from './types';

// analyticsQuestions.json is authored by hand against the QuestionDefinition
// shape in ./types — cast once here rather than sprinkling `as` everywhere.
export const QUESTION_CATALOGUE = raw as unknown as QuestionCatalogue;
export const QUESTIONS = QUESTION_CATALOGUE.questions;
