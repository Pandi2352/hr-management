import {
  applyOutcomes,
  conceptKey,
  conceptsForQuestion,
  masteryBand,
  masteryPct,
  masteryTrend,
  practiceSizeFor,
  weakConceptsFromAttempt,
  type ConceptEvent,
} from './learning-loop.util';

describe('conceptKey', () => {
  it('folds case and collapses whitespace', () => {
    expect(conceptKey('  MongoDB   Indexes ')).toBe('mongodb indexes');
    expect(conceptKey('mongodb indexes')).toBe(conceptKey('MongoDB Indexes'));
  });

  it('survives nonsense input', () => {
    expect(conceptKey('')).toBe('');
    expect(conceptKey(undefined as unknown as string)).toBe('');
  });
});

describe('conceptsForQuestion', () => {
  it('prefers tags, because an author who tagged said what it is about', () => {
    expect(
      conceptsForQuestion({ tags: ['Indexes', 'Aggregation'], section: 'Basics', category: 'DB' }),
    ).toEqual(['Indexes', 'Aggregation']);
  });

  it('falls back to the section, then the category', () => {
    expect(conceptsForQuestion({ section: 'Security', category: 'DB' })).toEqual(['Security']);
    expect(conceptsForQuestion({ category: 'DB' })).toEqual(['DB']);
  });

  it('always returns something, so no question is silently skipped', () => {
    expect(conceptsForQuestion({})).toEqual(['General']);
    expect(conceptsForQuestion({ tags: ['  ', ''] })).toEqual(['General']);
  });

  it('deduplicates tags that differ only in case', () => {
    expect(conceptsForQuestion({ tags: ['Indexes', 'indexes', 'INDEXES'] })).toEqual(['Indexes']);
  });

  it('caps how many concepts one question can speak for', () => {
    expect(conceptsForQuestion({ tags: ['a', 'b', 'c', 'd', 'e'] })).toEqual(['a', 'b', 'c']);
  });
});

describe('weakConceptsFromAttempt', () => {
  it('reports only concepts that were actually missed', () => {
    const weak = weakConceptsFromAttempt([
      { concepts: ['Indexes'], isCorrect: false },
      { concepts: ['Backups'], isCorrect: true },
    ]);
    expect(weak.map((w) => w.concept)).toEqual(['Indexes']);
  });

  it('counts a question against every concept it carries', () => {
    const weak = weakConceptsFromAttempt([
      { concepts: ['Indexes', 'Performance'], isCorrect: false },
    ]);
    expect(weak).toHaveLength(2);
    expect(weak.every((w) => w.missed === 1 && w.seen === 1)).toBe(true);
  });

  it('puts the most-missed concept first', () => {
    const weak = weakConceptsFromAttempt([
      { concepts: ['Indexes'], isCorrect: false },
      { concepts: ['Indexes'], isCorrect: false },
      { concepts: ['Backups'], isCorrect: false },
    ]);
    expect(weak[0].concept).toBe('Indexes');
    expect(weak[0].missed).toBe(2);
  });

  it('breaks a tie on accuracy, then alphabetically, so the order is stable', () => {
    const weak = weakConceptsFromAttempt([
      { concepts: ['Zeta'], isCorrect: false },
      { concepts: ['Alpha'], isCorrect: false },
    ]);
    expect(weak.map((w) => w.concept)).toEqual(['Alpha', 'Zeta']);
  });

  it('reports the accuracy for the attempt, not just the miss count', () => {
    const weak = weakConceptsFromAttempt([
      { concepts: ['Indexes'], isCorrect: true },
      { concepts: ['Indexes'], isCorrect: true },
      { concepts: ['Indexes'], isCorrect: false },
    ]);
    expect(weak[0]).toMatchObject({ seen: 3, missed: 1, attemptAccuracyPct: 67 });
  });

  it('returns nothing for a clean sheet', () => {
    expect(weakConceptsFromAttempt([{ concepts: ['Indexes'], isCorrect: true }])).toEqual([]);
  });

  it('ignores blank concept names rather than creating an empty bucket', () => {
    expect(weakConceptsFromAttempt([{ concepts: ['', '   '], isCorrect: false }])).toEqual([]);
  });
});

describe('masteryPct', () => {
  it('is plain accuracy a person can check by counting', () => {
    expect(masteryPct({ seen: 4, correct: 3 })).toBe(75);
    expect(masteryPct({ seen: 3, correct: 1 })).toBe(33);
  });

  it('is zero before anything has been answered', () => {
    expect(masteryPct({ seen: 0, correct: 0 })).toBe(0);
    expect(masteryPct(undefined as never)).toBe(0);
  });

  it('never leaves the 0–100 range even with corrupt tallies', () => {
    expect(masteryPct({ seen: 2, correct: 9 })).toBe(100);
    expect(masteryPct({ seen: 2, correct: -4 })).toBe(0);
  });
});

describe('masteryBand', () => {
  it('will not call two lucky answers mastery', () => {
    expect(masteryBand(100, 2)).toBe('DEVELOPING');
    expect(masteryBand(100, 3)).toBe('MASTERED');
  });

  it('bands a real history', () => {
    expect(masteryBand(95, 10)).toBe('MASTERED');
    expect(masteryBand(75, 10)).toBe('SOLID');
    expect(masteryBand(50, 10)).toBe('DEVELOPING');
    expect(masteryBand(20, 10)).toBe('FRAGILE');
  });
});

describe('masteryTrend', () => {
  const event = (correct: boolean): ConceptEvent => ({
    at: new Date(),
    correct,
    source: 'QUIZ',
  });

  it('says flat when there is not enough history to have a direction', () => {
    expect(masteryTrend([event(false), event(true)])).toBe('FLAT');
  });

  it('sees improvement after practice', () => {
    expect(
      masteryTrend([event(false), event(false), event(true), event(true), event(true)]),
    ).toBe('UP');
  });

  it('sees a slide', () => {
    expect(
      masteryTrend([event(true), event(true), event(true), event(false), event(false), event(false)]),
    ).toBe('DOWN');
  });
});

describe('applyOutcomes', () => {
  it('folds new answers into existing tallies', () => {
    const next = applyOutcomes(
      [{ concept: 'Indexes', seen: 2, correct: 1 }],
      [{ concepts: ['Indexes'], isCorrect: true }],
    );
    expect(next).toEqual([{ concept: 'Indexes', seen: 3, correct: 2 }]);
  });

  it('matches an existing concept regardless of how it was capitalised', () => {
    const next = applyOutcomes(
      [{ concept: 'Indexes', seen: 1, correct: 1 }],
      [{ concepts: ['indexes'], isCorrect: false }],
    );
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ seen: 2, correct: 1 });
  });

  it('adds concepts it has never seen before', () => {
    const next = applyOutcomes([], [{ concepts: ['Backups'], isCorrect: false }]);
    expect(next).toEqual([{ concept: 'Backups', seen: 1, correct: 0 }]);
  });

  it('does not mutate what it was given', () => {
    const existing = [{ concept: 'Indexes', seen: 1, correct: 1 }];
    applyOutcomes(existing, [{ concepts: ['Indexes'], isCorrect: false }]);
    expect(existing[0]).toEqual({ concept: 'Indexes', seen: 1, correct: 1 });
  });
});

describe('practiceSizeFor', () => {
  it('gives three questions per weak concept', () => {
    expect(practiceSizeFor(1)).toBe(3);
    expect(practiceSizeFor(2)).toBe(6);
  });

  it('caps the set so a bad attempt does not become a second exam', () => {
    expect(practiceSizeFor(8)).toBe(9);
  });

  it('builds nothing when nothing was missed', () => {
    expect(practiceSizeFor(0)).toBe(0);
  });
});
