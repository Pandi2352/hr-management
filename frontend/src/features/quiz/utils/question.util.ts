import type { QuestionType, QuizQuestion } from '../types/quiz.types';

/**
 * The client-side twin of the server's `questionDefect`.
 *
 * Deliberately says the same things in the same words. The server is the
 * authority — it refuses a bad question whatever the browser thinks — but a
 * person editing a question should find out while they are looking at it,
 * not after pressing save. Two checks that disagree would be worse than one,
 * so if this ever needs changing, change both.
 *
 * Returns the problem in words, or an empty string when there is none.
 */
export function questionDefect(q: Partial<QuizQuestion>): string {
  const type: QuestionType = (q.type as QuestionType) || 'SINGLE';

  if (!String(q.prompt || '').trim()) return 'it has no question text';

  if (type === 'FILL_BLANK') {
    const accepted = (q.acceptedAnswers || []).map((a) => String(a).trim()).filter(Boolean);
    return accepted.length === 0 ? 'it accepts no answer' : '';
  }

  const options = q.options || [];
  if (options.length < 2) return 'it has fewer than two options';
  if (options.some((o) => !String(o || '').trim())) return 'one of its options is blank';

  if (type === 'TRUE_FALSE' && options.length !== 2) {
    return 'a true/false question must have exactly two options';
  }

  const keys =
    type === 'MULTI' && (q.correctOptionIndexes || []).length > 0
      ? (q.correctOptionIndexes as number[])
      : Number.isInteger(q.correctOptionIndex) && (q.correctOptionIndex as number) >= 0
        ? [q.correctOptionIndex as number]
        : [];

  if (keys.length === 0) return 'no correct answer is marked';
  if (keys.some((i) => i >= options.length)) {
    return 'its answer key points past the end of its options';
  }
  if (type === 'MULTI' && keys.length < 2) {
    return 'a multiple-answer question needs at least two correct options';
  }

  return '';
}

/**
 * A question as the API expects it.
 *
 * Every field the schema stores, passed through rather than listed by hand.
 * The studio's save used to name five fields, which silently dropped the type,
 * the multiple-answer key and the accepted answers — so a fill-in-the-blank
 * arrived at the server looking like a single-choice question with no options
 * and was refused for having fewer than two.
 */
export function toQuestionPayload(q: QuizQuestion) {
  return {
    type: (q.type as QuestionType) || 'SINGLE',
    prompt: q.prompt,
    options: q.options || [],
    correctOptionIndex: Number.isInteger(q.correctOptionIndex) ? (q.correctOptionIndex as number) : -1,
    correctOptionIndexes: q.correctOptionIndexes || [],
    acceptedAnswers: q.acceptedAnswers || [],
    explanation: q.explanation || '',
    points: q.points,
    tags: q.tags || [],
    section: q.section || '',
    sourceEvidence: q.sourceEvidence || '',
  };
}

/** The first unusable question in a set, as a message naming its position. */
export function firstQuestionProblem(questions: QuizQuestion[]): string {
  for (let i = 0; i < questions.length; i += 1) {
    const defect = questionDefect(questions[i]);
    if (defect) return `Question ${i + 1} cannot be used: ${defect}.`;
  }
  return '';
}
