/**
 * What kinds of question exist, and how each one is marked.
 *
 * Pure, and tested on its own, because this is the code that decides whether
 * somebody passed. Everything it needs arrives as arguments: no database, no
 * model, no clock.
 */

export const QUESTION_TYPES = ['SINGLE', 'MULTI', 'TRUE_FALSE', 'FILL_BLANK'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: 'Multiple choice',
  MULTI: 'Multiple answers',
  TRUE_FALSE: 'True or false',
  FILL_BLANK: 'Fill in the blank',
};

/** The two options a true/false question always has, in this order. */
export const TRUE_FALSE_OPTIONS = ['True', 'False'];

/**
 * Whether a question's options may be reordered before it is shown.
 *
 * True and False are shuffled nowhere in the world, and swapping them makes a
 * question read as a trick. A fill-in-the-blank has no options to shuffle.
 */
export function canShuffleOptions(type: QuestionType): boolean {
  return type === 'SINGLE' || type === 'MULTI';
}

/**
 * Folds away the differences that are not the answer.
 *
 * Case, surrounding space, repeated inner space, and a trailing full stop. A
 * person who typed "  Idempotent " knew the answer; marking them wrong for the
 * spacebar is marking the wrong thing.
 */
export function normalizeText(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '');
}

export interface GradableQuestion {
  type?: QuestionType | string;
  options?: string[];
  correctOptionIndex?: number;
  correctOptionIndexes?: number[];
  acceptedAnswers?: string[];
}

export interface SubmittedAnswer {
  /** The position clicked, for a single-answer question. -1 for unanswered. */
  selectedOptionIndex?: number;
  /** The positions clicked, for a multiple-answer question. */
  selectedOptionIndexes?: number[];
  /** What was typed, for a fill-in-the-blank. */
  textAnswer?: string;
}

/** The question's type, defaulting to single choice for anything older. */
export function questionType(q: GradableQuestion): QuestionType {
  const raw = String(q?.type || 'SINGLE').toUpperCase() as QuestionType;
  return QUESTION_TYPES.includes(raw) ? raw : 'SINGLE';
}

/** The indexes that count as correct, whatever field they were stored in. */
export function correctIndexes(q: GradableQuestion): number[] {
  const type = questionType(q);

  if (type === 'MULTI') {
    const many = (q.correctOptionIndexes || []).filter((i) => Number.isInteger(i) && i >= 0);
    if (many.length > 0) return Array.from(new Set(many)).sort((a, b) => a - b);
  }

  const single = Number(q.correctOptionIndex);
  return Number.isInteger(single) && single >= 0 ? [single] : [];
}

/**
 * Whether one answer is right.
 *
 * Unanswered is always wrong and never an error: a timed quiz submits blanks
 * on the person's behalf, and refusing to grade them would lose the attempt.
 */
export function isAnswerCorrect(q: GradableQuestion, submitted: SubmittedAnswer): boolean {
  const type = questionType(q);

  if (type === 'FILL_BLANK') {
    const typed = normalizeText(submitted?.textAnswer || '');
    if (!typed) return false;
    const accepted = (q.acceptedAnswers || []).map(normalizeText).filter(Boolean);
    return accepted.includes(typed);
  }

  if (type === 'MULTI') {
    const chosen = Array.from(
      new Set((submitted?.selectedOptionIndexes || []).filter((i) => Number.isInteger(i) && i >= 0)),
    ).sort((a, b) => a - b);
    const key = correctIndexes(q);

    // Exact set match. Partial credit on a multiple-answer question means
    // guessing every box scores well, which is the opposite of measuring.
    if (chosen.length === 0 || chosen.length !== key.length) return false;
    return chosen.every((v, i) => v === key[i]);
  }

  const chosen = Number(submitted?.selectedOptionIndex);
  if (!Number.isInteger(chosen) || chosen < 0) return false;
  return correctIndexes(q).includes(chosen);
}

/**
 * Turns positions on the screen back into positions in the stored question.
 *
 * Options are shuffled per sitting, so "the second one" is not the second one
 * in the database. Grading without this step marks almost every answer on a
 * shuffled quiz wrong.
 */
export function mapThroughShuffle(
  shown: number,
  optionOrder: number[] | undefined,
): number {
  if (!optionOrder || shown < 0 || shown >= optionOrder.length) return shown;
  return optionOrder[shown];
}

/** A readable record of what was chosen, for the explainable score. */
export function answerAsText(q: GradableQuestion, submitted: SubmittedAnswer): string {
  const type = questionType(q);
  const options = q.options || [];

  if (type === 'FILL_BLANK') return submitted?.textAnswer || '';

  if (type === 'MULTI') {
    return (submitted?.selectedOptionIndexes || [])
      .filter((i) => i >= 0 && i < options.length)
      .map((i) => options[i])
      .join(', ');
  }

  const i = Number(submitted?.selectedOptionIndex);
  return Number.isInteger(i) && i >= 0 && i < options.length ? options[i] : '';
}

/**
 * Whether a question is well-formed enough to put in front of anybody.
 *
 * Returns the problem in words a reviewer can act on, or an empty string when
 * there is none. Used at the review gate, so a broken question is caught before
 * publication rather than by the first person to sit it.
 */
export function questionDefect(q: GradableQuestion & { prompt?: string }): string {
  const type = questionType(q);

  if (!String(q.prompt || '').trim()) return 'it has no question text';

  if (type === 'FILL_BLANK') {
    const accepted = (q.acceptedAnswers || []).map(normalizeText).filter(Boolean);
    return accepted.length === 0 ? 'it accepts no answer' : '';
  }

  const options = q.options || [];
  if (options.length < 2) return 'it has fewer than two options';
  if (options.some((o) => !String(o || '').trim())) return 'one of its options is blank';

  if (type === 'TRUE_FALSE' && options.length !== 2) {
    return 'a true/false question must have exactly two options';
  }

  const key = correctIndexes(q);
  if (key.length === 0) return 'no correct answer is marked';
  if (key.some((i) => i >= options.length)) {
    return 'its answer key points past the end of its options';
  }
  if (type === 'MULTI' && key.length < 2) {
    return 'a multiple-answer question needs at least two correct options';
  }

  return '';
}
