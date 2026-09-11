/**
 * The arithmetic behind the Skill Passport, the Training ROI dashboard and the
 * Explainable Score.
 *
 * Pure and separate from the service for the same reason the learning loop's
 * maths is: these numbers are shown to people as statements about their
 * capability, and to HR as evidence in a dispute. Anything that carries that
 * weight has to be checkable without a database in front of you.
 */

/**
 * The grading rules a score was produced under.
 *
 * Bump this whenever the way a score is calculated changes — points, rounding,
 * how an unanswered question is treated. Old attempts keep the version they
 * were graded with, so a dispute about an old result is answered with the
 * rules that were actually applied to it.
 */
export const GRADING_VERSION = 'v1';

/** What the grading version actually does, in words a non-engineer can check. */
export const GRADING_RULES: Record<string, string[]> = {
  v1: [
    'Each question is worth its own points value, defaulting to 10.',
    'A correct answer scores the full points for that question; anything else scores zero.',
    'An unanswered question is recorded as -1 and scores zero. It is not excluded from the total.',
    'Options are shuffled per sitting; the answer is mapped back to the original order before grading.',
    'Score percentage = points awarded ÷ points available × 100, rounded to the nearest whole number.',
    'The attempt passes when that percentage is greater than or equal to the pass mark in force at the time.',
  ],
};

// --- Skill Passport ---------------------------------------------------------

/**
 * The levels a skill is reported at.
 *
 * Four rather than three, because "Developing" has to mean something different
 * from "we have barely measured this". Calling a skill Developing on the
 * strength of two answers overstates what is known about it.
 */
export type SkillLevel = 'Emerging' | 'Developing' | 'Intermediate' | 'Advanced';

export const SKILL_LEVELS: SkillLevel[] = ['Emerging', 'Developing', 'Intermediate', 'Advanced'];

/** How much evidence a skill needs before it can be called anything but Emerging. */
export const MIN_EVIDENCE_FOR_LEVEL = 3;

/**
 * The level a skill is reported at.
 *
 * Evidence gates the level, not just the percentage. Someone who answered two
 * questions correctly is Emerging however perfect that looks, because two
 * answers cannot tell a strong skill from a lucky one.
 */
export function skillLevel(masteryPct: number, evidenceCount: number): SkillLevel {
  if (evidenceCount < MIN_EVIDENCE_FOR_LEVEL) return 'Emerging';
  if (masteryPct >= 80) return 'Advanced';
  if (masteryPct >= 55) return 'Intermediate';
  return 'Developing';
}

/** The one-word summary at the top of a passport. */
export type PassportHeadline = 'Starting out' | 'Growing' | 'Steady' | 'Accelerating';

/**
 * How this person is moving, not where they are.
 *
 * A passport that only reported level would tell a strong performer they are
 * strong and a struggling one they are struggling, which neither of them needs
 * to be told. Direction is the part that is worth reading.
 */
export function passportHeadline(input: {
  skillsTracked: number;
  improving: number;
  slipping: number;
}): PassportHeadline {
  if (input.skillsTracked < 3) return 'Starting out';
  if (input.improving >= 2 && input.improving > input.slipping) return 'Accelerating';
  if (input.improving > input.slipping) return 'Growing';
  return 'Steady';
}

// --- Training ROI -----------------------------------------------------------

/** A rate, kept as its parts so the percentage can always be checked. */
export interface Rate {
  numerator: number;
  denominator: number;
  pct: number;
}

export function rate(numerator: number, denominator: number): Rate {
  const pct = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
  return { numerator, denominator, pct };
}

/**
 * How much better people did on a later attempt than on their first.
 *
 * Only counts people who actually sat more than once: including single-attempt
 * learners would dilute the figure with zeros and make retries look useless.
 * Reported in percentage points, which is what "improvement" means here.
 */
export function improvementAfterRetry(
  attemptsByPerson: { firstScorePct: number; latestScorePct: number; attempts: number }[],
): {
  learnersWithRetry: number;
  avgFirstPct: number;
  avgLatestPct: number;
  deltaPoints: number;
} {
  const retried = (attemptsByPerson || []).filter((p) => p.attempts > 1);
  if (retried.length === 0) {
    return { learnersWithRetry: 0, avgFirstPct: 0, avgLatestPct: 0, deltaPoints: 0 };
  }

  const mean = (pick: (p: (typeof retried)[number]) => number) =>
    Math.round(retried.reduce((sum, p) => sum + pick(p), 0) / retried.length);

  const avgFirstPct = mean((p) => p.firstScorePct);
  const avgLatestPct = mean((p) => p.latestScorePct);

  return {
    learnersWithRetry: retried.length,
    avgFirstPct,
    avgLatestPct,
    deltaPoints: avgLatestPct - avgFirstPct,
  };
}

export type ClarityFlag = 'TOO_HARD' | 'TOO_EASY' | 'HEALTHY';

/** How many people must have seen a question before its statistics mean anything. */
export const MIN_RESPONSES_FOR_CLARITY = 5;

/**
 * Whether a question is doing its job.
 *
 * A question nearly everybody gets wrong is usually badly worded or has the
 * wrong key, not proof that nobody knows the material. One nearly everybody
 * gets right measures nothing. Both are flagged for a human to look at; neither
 * is called a defect on its own.
 */
export function clarityFlag(correct: number, responses: number): ClarityFlag {
  if (responses < MIN_RESPONSES_FOR_CLARITY) return 'HEALTHY';
  const pct = (correct / responses) * 100;
  if (pct <= 25) return 'TOO_HARD';
  if (pct >= 95) return 'TOO_EASY';
  return 'HEALTHY';
}

export function clarityReason(flag: ClarityFlag, correctPct: number): string {
  if (flag === 'TOO_HARD') {
    return `Only ${correctPct}% get this right. Check the wording and the answer key before assuming it is a knowledge gap.`;
  }
  if (flag === 'TOO_EASY') {
    return `${correctPct}% get this right. It is not separating people who know the material from people who do not.`;
  }
  return '';
}

/**
 * Why somebody was flagged as needing support.
 *
 * Ordered by how much attention each case deserves: a person who has run out
 * of attempts cannot fix it themselves, so they come before someone who simply
 * has not tried again yet.
 */
export type SupportReason =
  | 'FAILED_ALL_ATTEMPTS'
  | 'NOT_IMPROVING'
  | 'BELOW_PASS'
  | 'OVERDUE';

export const SUPPORT_REASON_LABELS: Record<SupportReason, string> = {
  FAILED_ALL_ATTEMPTS: 'Out of attempts and still below the pass mark',
  NOT_IMPROVING: 'Retried and did not improve',
  BELOW_PASS: 'Below the pass mark',
  OVERDUE: 'Assigned and past its due date',
};

export const SUPPORT_REASON_PRIORITY: SupportReason[] = [
  'FAILED_ALL_ATTEMPTS',
  'NOT_IMPROVING',
  'OVERDUE',
  'BELOW_PASS',
];

export function supportRank(reason: SupportReason): number {
  const i = SUPPORT_REASON_PRIORITY.indexOf(reason);
  return i === -1 ? SUPPORT_REASON_PRIORITY.length : i;
}

/**
 * Turns the dashboard's own numbers into things to actually do.
 *
 * Rules, not a model: a recommendation that an administrator cannot trace back
 * to the figure that produced it is one they cannot act on or argue with.
 */
export function trainingRecommendations(input: {
  completion: Rate;
  pass: Rate;
  improvement: { learnersWithRetry: number; deltaPoints: number };
  weakestSkills: { skill: string; masteryPct: number; learnersAffected: number }[];
  flaggedQuestions: number;
  needingSupport: number;
}): string[] {
  const out: string[] = [];

  if (input.completion.denominator === 0) {
    out.push('Nothing has been assigned yet. Assign an approved quiz to start collecting evidence.');
    return out;
  }

  if (input.completion.pct < 60) {
    out.push(
      `Only ${input.completion.pct}% of assignments have been completed. Chase the ${input.completion.denominator - input.completion.numerator} outstanding before reading anything else here.`,
    );
  }

  if (input.pass.denominator >= 5 && input.pass.pct < 50) {
    out.push(
      `The pass rate is ${input.pass.pct}%. Either the material has not been taught yet or the pass mark is set too high for this cohort.`,
    );
  }

  if (input.improvement.learnersWithRetry >= 3 && input.improvement.deltaPoints <= 0) {
    out.push(
      'Retries are not improving scores. Retrying without teaching in between changes nothing — point people at the learning loop first.',
    );
  }

  if (input.improvement.learnersWithRetry >= 3 && input.improvement.deltaPoints >= 10) {
    out.push(
      `Retries gain ${input.improvement.deltaPoints} points on average. The loop is working; widen it to the people who have not retried.`,
    );
  }

  for (const skill of input.weakestSkills.slice(0, 2)) {
    if (skill.learnersAffected >= 3) {
      out.push(
        `${skill.learnersAffected} people sit at ${skill.masteryPct}% on ${skill.skill}. That is a session to run, not ${skill.learnersAffected} conversations to have.`,
      );
    }
  }

  if (input.flaggedQuestions > 0) {
    out.push(
      `${input.flaggedQuestions} question${input.flaggedQuestions === 1 ? ' needs' : 's need'} review before the next round — at that hit rate they are measuring wording, not knowledge.`,
    );
  }

  if (input.needingSupport > 0) {
    out.push(
      `${input.needingSupport} ${input.needingSupport === 1 ? 'person needs' : 'people need'} a hand directly; they cannot resolve it by retrying.`,
    );
  }

  if (out.length === 0) {
    out.push('Completion, pass rate and improvement are all healthy. Nothing needs intervention.');
  }

  return out;
}

// --- Explainable Score ------------------------------------------------------

/**
 * Recomputes a score from the stored answers.
 *
 * The point is not to produce the number — that was stored at grade time — but
 * to let the explanation show its working and to catch the case where the two
 * disagree. A stored score that cannot be reproduced from the stored answers
 * is exactly what an audit needs to be told about.
 */
export function recomputeScore(
  answers: { pointsAwarded?: number; pointsPossible?: number }[],
): { awarded: number; possible: number; pct: number } {
  const awarded = (answers || []).reduce((sum, a) => sum + (Number(a.pointsAwarded) || 0), 0);
  const possible = (answers || []).reduce((sum, a) => sum + (Number(a.pointsPossible) || 0), 0);
  const pct = possible > 0 ? Math.round((awarded / possible) * 100) : 0;
  return { awarded, possible, pct };
}
