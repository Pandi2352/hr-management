import {
  answerAsText,
  canShuffleOptions,
  correctIndexes,
  isAnswerCorrect,
  mapThroughShuffle,
  normalizeText,
  questionDefect,
  questionType,
} from './question-grading.util';

describe('questionType', () => {
  it('treats anything without a type as multiple choice', () => {
    expect(questionType({})).toBe('SINGLE');
    expect(questionType({ type: 'NONSENSE' })).toBe('SINGLE');
  });

  it('accepts a type in any casing', () => {
    expect(questionType({ type: 'fill_blank' })).toBe('FILL_BLANK');
  });
});

describe('normalizeText', () => {
  it('folds away what is not the answer', () => {
    expect(normalizeText('  Idempotent ')).toBe('idempotent');
    expect(normalizeText('Two   words')).toBe('two words');
    expect(normalizeText('Yes.')).toBe('yes');
  });

  it('survives nothing at all', () => {
    expect(normalizeText(undefined as unknown as string)).toBe('');
  });
});

describe('single choice', () => {
  const q = { type: 'SINGLE' as const, options: ['a', 'b', 'c'], correctOptionIndex: 1 };

  it('marks the key correct and everything else wrong', () => {
    expect(isAnswerCorrect(q, { selectedOptionIndex: 1 })).toBe(true);
    expect(isAnswerCorrect(q, { selectedOptionIndex: 0 })).toBe(false);
  });

  it('marks an unanswered question wrong rather than throwing', () => {
    expect(isAnswerCorrect(q, { selectedOptionIndex: -1 })).toBe(false);
    expect(isAnswerCorrect(q, {})).toBe(false);
  });
});

describe('true or false', () => {
  const q = { type: 'TRUE_FALSE' as const, options: ['True', 'False'], correctOptionIndex: 0 };

  it('grades like a two-option choice', () => {
    expect(isAnswerCorrect(q, { selectedOptionIndex: 0 })).toBe(true);
    expect(isAnswerCorrect(q, { selectedOptionIndex: 1 })).toBe(false);
  });

  it('is never shuffled, because swapping True and False reads as a trick', () => {
    expect(canShuffleOptions('TRUE_FALSE')).toBe(false);
    expect(canShuffleOptions('SINGLE')).toBe(true);
    expect(canShuffleOptions('FILL_BLANK')).toBe(false);
  });
});

describe('multiple answers', () => {
  const q = {
    type: 'MULTI' as const,
    options: ['a', 'b', 'c', 'd'],
    correctOptionIndexes: [1, 2],
  };

  it('needs the exact set, in any order', () => {
    expect(isAnswerCorrect(q, { selectedOptionIndexes: [2, 1] })).toBe(true);
    expect(isAnswerCorrect(q, { selectedOptionIndexes: [1, 2] })).toBe(true);
  });

  it('gives nothing for a subset, so guessing everything does not score', () => {
    expect(isAnswerCorrect(q, { selectedOptionIndexes: [1] })).toBe(false);
    expect(isAnswerCorrect(q, { selectedOptionIndexes: [0, 1, 2, 3] })).toBe(false);
  });

  it('ignores a repeated click rather than failing on it', () => {
    expect(isAnswerCorrect(q, { selectedOptionIndexes: [1, 2, 2] })).toBe(true);
  });

  it('marks an empty selection wrong', () => {
    expect(isAnswerCorrect(q, { selectedOptionIndexes: [] })).toBe(false);
  });
});

describe('fill in the blank', () => {
  const q = {
    type: 'FILL_BLANK' as const,
    acceptedAnswers: ['Idempotent', 'idempotency'],
  };

  it('accepts any of the listed answers, however typed', () => {
    expect(isAnswerCorrect(q, { textAnswer: 'IDEMPOTENT' })).toBe(true);
    expect(isAnswerCorrect(q, { textAnswer: '  idempotency  ' })).toBe(true);
  });

  it('rejects something else', () => {
    expect(isAnswerCorrect(q, { textAnswer: 'atomic' })).toBe(false);
  });

  it('marks a blank answer wrong', () => {
    expect(isAnswerCorrect(q, { textAnswer: '   ' })).toBe(false);
    expect(isAnswerCorrect(q, {})).toBe(false);
  });

  it('cannot be passed by a question that accepts nothing', () => {
    expect(isAnswerCorrect({ type: 'FILL_BLANK', acceptedAnswers: [] }, { textAnswer: 'x' })).toBe(
      false,
    );
  });
});

describe('correctIndexes', () => {
  it('reads the single key for a single-answer question', () => {
    expect(correctIndexes({ correctOptionIndex: 2 })).toEqual([2]);
  });

  it('reads the set for a multiple-answer question, sorted and deduplicated', () => {
    expect(correctIndexes({ type: 'MULTI', correctOptionIndexes: [3, 1, 1] })).toEqual([1, 3]);
  });

  it('falls back to the single key when a multi question has no set', () => {
    expect(correctIndexes({ type: 'MULTI', correctOptionIndex: 0 })).toEqual([0]);
  });

  it('returns nothing when no key was ever set', () => {
    expect(correctIndexes({})).toEqual([]);
  });
});

describe('mapThroughShuffle', () => {
  it('turns a screen position back into a stored position', () => {
    expect(mapThroughShuffle(0, [2, 0, 1])).toBe(2);
    expect(mapThroughShuffle(2, [2, 0, 1])).toBe(1);
  });

  it('passes the position straight through when nothing was shuffled', () => {
    expect(mapThroughShuffle(1, undefined)).toBe(1);
  });

  it('leaves an unanswered marker alone', () => {
    expect(mapThroughShuffle(-1, [2, 0, 1])).toBe(-1);
  });
});

describe('answerAsText', () => {
  it('names the option chosen', () => {
    expect(answerAsText({ options: ['a', 'b'] }, { selectedOptionIndex: 1 })).toBe('b');
  });

  it('lists every option chosen on a multiple-answer question', () => {
    expect(
      answerAsText({ type: 'MULTI', options: ['a', 'b', 'c'] }, { selectedOptionIndexes: [0, 2] }),
    ).toBe('a, c');
  });

  it('gives back what was typed', () => {
    expect(answerAsText({ type: 'FILL_BLANK' }, { textAnswer: 'idempotent' })).toBe('idempotent');
  });

  it('is empty for an unanswered question', () => {
    expect(answerAsText({ options: ['a'] }, { selectedOptionIndex: -1 })).toBe('');
  });
});

describe('questionDefect', () => {
  it('passes a well-formed question of each type', () => {
    expect(questionDefect({ prompt: 'q', options: ['a', 'b'], correctOptionIndex: 0 })).toBe('');
    expect(
      questionDefect({
        prompt: 'q',
        type: 'TRUE_FALSE',
        options: ['True', 'False'],
        correctOptionIndex: 1,
      }),
    ).toBe('');
    expect(
      questionDefect({
        prompt: 'q',
        type: 'MULTI',
        options: ['a', 'b', 'c'],
        correctOptionIndexes: [0, 2],
      }),
    ).toBe('');
    expect(questionDefect({ prompt: 'q', type: 'FILL_BLANK', acceptedAnswers: ['x'] })).toBe('');
  });

  it('catches a question nobody can answer', () => {
    expect(questionDefect({ prompt: '', options: ['a', 'b'], correctOptionIndex: 0 })).toContain(
      'no question text',
    );
    expect(questionDefect({ prompt: 'q', type: 'FILL_BLANK', acceptedAnswers: [] })).toContain(
      'accepts no answer',
    );
  });

  it('catches a key that points past the options', () => {
    expect(questionDefect({ prompt: 'q', options: ['a', 'b'], correctOptionIndex: 5 })).toContain(
      'past the end',
    );
  });

  it('catches a blank option and a missing key', () => {
    expect(questionDefect({ prompt: 'q', options: ['a', '  '], correctOptionIndex: 0 })).toContain(
      'blank',
    );
    expect(questionDefect({ prompt: 'q', options: ['a', 'b'] })).toContain('no correct answer');
  });

  it('insists a multiple-answer question has more than one answer', () => {
    expect(
      questionDefect({ prompt: 'q', type: 'MULTI', options: ['a', 'b'], correctOptionIndexes: [0] }),
    ).toContain('at least two');
  });

  it('insists true/false has exactly two options', () => {
    expect(
      questionDefect({
        prompt: 'q',
        type: 'TRUE_FALSE',
        options: ['True', 'False', 'Maybe'],
        correctOptionIndex: 0,
      }),
    ).toContain('exactly two');
  });
});
