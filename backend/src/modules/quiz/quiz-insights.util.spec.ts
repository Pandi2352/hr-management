import {
  clarityFlag,
  clarityReason,
  improvementAfterRetry,
  passportHeadline,
  rate,
  recomputeScore,
  skillLevel,
  supportRank,
  trainingRecommendations,
  GRADING_RULES,
  GRADING_VERSION,
} from './quiz-insights.util';

describe('skillLevel', () => {
  it('will not name a level on two answers, however good they look', () => {
    expect(skillLevel(100, 2)).toBe('Emerging');
    expect(skillLevel(100, 3)).toBe('Advanced');
  });

  it('bands a measured skill', () => {
    expect(skillLevel(85, 10)).toBe('Advanced');
    expect(skillLevel(60, 10)).toBe('Intermediate');
    expect(skillLevel(30, 10)).toBe('Developing');
  });

  it('puts the boundaries where the labels claim they are', () => {
    expect(skillLevel(80, 5)).toBe('Advanced');
    expect(skillLevel(79, 5)).toBe('Intermediate');
    expect(skillLevel(55, 5)).toBe('Intermediate');
    expect(skillLevel(54, 5)).toBe('Developing');
  });
});

describe('passportHeadline', () => {
  it('says starting out until there is a profile to speak of', () => {
    expect(passportHeadline({ skillsTracked: 2, improving: 2, slipping: 0 })).toBe('Starting out');
  });

  it('reports direction rather than standing', () => {
    expect(passportHeadline({ skillsTracked: 6, improving: 3, slipping: 0 })).toBe('Accelerating');
    expect(passportHeadline({ skillsTracked: 6, improving: 1, slipping: 0 })).toBe('Growing');
    expect(passportHeadline({ skillsTracked: 6, improving: 1, slipping: 3 })).toBe('Steady');
  });
});

describe('rate', () => {
  it('keeps its own parts so the percentage can be checked', () => {
    expect(rate(3, 4)).toEqual({ numerator: 3, denominator: 4, pct: 75 });
  });

  it('does not divide by zero', () => {
    expect(rate(0, 0).pct).toBe(0);
  });
});

describe('improvementAfterRetry', () => {
  it('ignores people who only sat it once', () => {
    const out = improvementAfterRetry([
      { firstScorePct: 40, latestScorePct: 40, attempts: 1 },
      { firstScorePct: 40, latestScorePct: 80, attempts: 2 },
    ]);
    expect(out.learnersWithRetry).toBe(1);
    expect(out.deltaPoints).toBe(40);
  });

  it('reports zeros rather than NaN when nobody has retried', () => {
    expect(improvementAfterRetry([{ firstScorePct: 50, latestScorePct: 50, attempts: 1 }])).toEqual({
      learnersWithRetry: 0,
      avgFirstPct: 0,
      avgLatestPct: 0,
      deltaPoints: 0,
    });
  });

  it('can report that retries made things worse', () => {
    const out = improvementAfterRetry([
      { firstScorePct: 80, latestScorePct: 60, attempts: 2 },
      { firstScorePct: 70, latestScorePct: 60, attempts: 3 },
    ]);
    expect(out.deltaPoints).toBeLessThan(0);
  });

  it('survives an empty roster', () => {
    expect(improvementAfterRetry([]).learnersWithRetry).toBe(0);
  });
});

describe('clarityFlag', () => {
  it('says nothing until enough people have seen the question', () => {
    expect(clarityFlag(0, 4)).toBe('HEALTHY');
  });

  it('flags a question almost nobody gets right', () => {
    expect(clarityFlag(1, 10)).toBe('TOO_HARD');
  });

  it('flags a question almost everybody gets right', () => {
    expect(clarityFlag(20, 20)).toBe('TOO_EASY');
  });

  it('leaves a question that separates people alone', () => {
    expect(clarityFlag(6, 10)).toBe('HEALTHY');
  });

  it('explains the flag in words an author can act on', () => {
    expect(clarityReason('TOO_HARD', 10)).toContain('answer key');
    expect(clarityReason('TOO_EASY', 97)).toContain('separating');
    expect(clarityReason('HEALTHY', 60)).toBe('');
  });
});

describe('supportRank', () => {
  it('puts the people who cannot help themselves first', () => {
    expect(supportRank('FAILED_ALL_ATTEMPTS')).toBeLessThan(supportRank('BELOW_PASS'));
    expect(supportRank('NOT_IMPROVING')).toBeLessThan(supportRank('OVERDUE'));
  });
});

describe('trainingRecommendations', () => {
  const base = {
    completion: rate(9, 10),
    pass: rate(8, 10),
    improvement: { learnersWithRetry: 0, deltaPoints: 0 },
    weakestSkills: [],
    flaggedQuestions: 0,
    needingSupport: 0,
  };

  it('says so plainly when nothing needs doing', () => {
    expect(trainingRecommendations(base)[0]).toContain('Nothing needs intervention');
  });

  it('refuses to interpret numbers from an empty programme', () => {
    const out = trainingRecommendations({ ...base, completion: rate(0, 0) });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('Nothing has been assigned');
  });

  it('puts completion first, because the rest is unreadable without it', () => {
    const out = trainingRecommendations({ ...base, completion: rate(2, 10), pass: rate(1, 10) });
    expect(out[0]).toContain('completed');
  });

  it('questions the pass mark rather than only the learners', () => {
    const out = trainingRecommendations({ ...base, pass: rate(2, 10) });
    expect(out.join(' ')).toContain('pass mark is set too high');
  });

  it('calls out retries that are not working', () => {
    const out = trainingRecommendations({
      ...base,
      improvement: { learnersWithRetry: 4, deltaPoints: -2 },
    });
    expect(out.join(' ')).toContain('not improving');
  });

  it('turns a shared weakness into one session, not many conversations', () => {
    const out = trainingRecommendations({
      ...base,
      weakestSkills: [{ skill: 'Indexes', masteryPct: 30, learnersAffected: 6 }],
    });
    expect(out.join(' ')).toContain('session to run');
  });

  it('names flagged questions as a wording problem, not a knowledge one', () => {
    const out = trainingRecommendations({ ...base, flaggedQuestions: 2 });
    expect(out.join(' ')).toContain('measuring wording');
  });
});

describe('recomputeScore', () => {
  it('shows the working behind a stored score', () => {
    expect(
      recomputeScore([
        { pointsAwarded: 10, pointsPossible: 10 },
        { pointsAwarded: 0, pointsPossible: 10 },
      ]),
    ).toEqual({ awarded: 10, possible: 20, pct: 50 });
  });

  it('counts an unanswered question in the total rather than excluding it', () => {
    const out = recomputeScore([
      { pointsAwarded: 10, pointsPossible: 10 },
      { pointsAwarded: 0, pointsPossible: 10 },
      { pointsAwarded: 0, pointsPossible: 10 },
    ]);
    expect(out.pct).toBe(33);
  });

  it('does not divide by zero on an empty attempt', () => {
    expect(recomputeScore([]).pct).toBe(0);
  });

  it('treats missing point fields as zero rather than NaN', () => {
    expect(recomputeScore([{}, {}]).pct).toBe(0);
  });
});

describe('grading version', () => {
  it('has rules published for the version in use', () => {
    expect(GRADING_RULES[GRADING_VERSION]).toBeDefined();
    expect(GRADING_RULES[GRADING_VERSION].length).toBeGreaterThan(3);
  });

  it('states how an unanswered question is treated, which is the usual dispute', () => {
    expect(GRADING_RULES[GRADING_VERSION].join(' ')).toContain('unanswered');
  });
});
