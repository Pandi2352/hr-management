/**
 * The arithmetic behind the Wrong Answer → Learning Loop.
 *
 * Kept pure and separate from the service so the part that decides what someone
 * is weak at, and whether they are getting better, can be tested without a
 * database or a model behind it. Everything here is deterministic: the same
 * attempt always produces the same diagnosis, which matters when the output is
 * shown to a person as a judgement about their knowledge.
 */

/** How confident we are that someone actually knows a concept. */
export type MasteryBand = 'FRAGILE' | 'DEVELOPING' | 'SOLID' | 'MASTERED';

export const MASTERY_BANDS: MasteryBand[] = ['FRAGILE', 'DEVELOPING', 'SOLID', 'MASTERED'];

export const MASTERY_BAND_LABELS: Record<MasteryBand, string> = {
  FRAGILE: 'Fragile',
  DEVELOPING: 'Developing',
  SOLID: 'Solid',
  MASTERED: 'Mastered',
};

/** One recorded answer against a concept. */
export interface ConceptEvent {
  at: Date;
  correct: boolean;
  source: 'QUIZ' | 'PRACTICE';
}

export interface ConceptTally {
  concept: string;
  seen: number;
  correct: number;
}

/** What one question can teach us about, in priority order. */
export interface ConceptSource {
  tags?: string[];
  section?: string;
  category?: string;
}

/** The most concepts one question is allowed to speak for. */
export const MAX_CONCEPTS_PER_QUESTION = 3;

/**
 * Normalises a concept name so "MongoDB Indexes", "mongodb indexes" and
 * " MongoDB  Indexes " are one concept rather than three.
 *
 * Case is folded for comparison but the first spelling seen is what gets shown,
 * because a concept called "mongodb" reads as a typo next to one called "REST".
 */
export function conceptKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Which concepts a question belongs to.
 *
 * Tags first, because an author who bothered to tag a question has said what it
 * is about more precisely than its category ever will. A section is the next
 * best thing. The category is the floor: every question has one, so the loop
 * always has something to say rather than silently skipping a question.
 */
export function conceptsForQuestion(q: ConceptSource): string[] {
  const fromTags = (q.tags || [])
    .map((t) => String(t || '').trim())
    .filter(Boolean);

  if (fromTags.length > 0) return dedupe(fromTags).slice(0, MAX_CONCEPTS_PER_QUESTION);

  const section = String(q.section || '').trim();
  if (section) return [section];

  const category = String(q.category || '').trim();
  return category ? [category] : ['General'];
}

function dedupe(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = conceptKey(name);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

export interface AnswerOutcome {
  /** The concepts the answered question belongs to. */
  concepts: string[];
  isCorrect: boolean;
}

export interface WeakConcept {
  concept: string;
  missed: number;
  seen: number;
  /** 0–100 for this attempt alone. */
  attemptAccuracyPct: number;
}

/**
 * What went wrong in one attempt, grouped by concept.
 *
 * Only concepts with at least one miss come back, sorted so the worst is first:
 * most missed, then lowest accuracy, then alphabetically so the order is stable
 * between two identically bad concepts. A person reading this should find the
 * thing most worth their next ten minutes at the top.
 */
export function weakConceptsFromAttempt(outcomes: AnswerOutcome[]): WeakConcept[] {
  const tally = new Map<string, { concept: string; seen: number; missed: number }>();

  for (const outcome of outcomes) {
    for (const concept of outcome.concepts) {
      const key = conceptKey(concept);
      if (!key) continue;
      const row = tally.get(key) || { concept, seen: 0, missed: 0 };
      row.seen += 1;
      if (!outcome.isCorrect) row.missed += 1;
      tally.set(key, row);
    }
  }

  return Array.from(tally.values())
    .filter((row) => row.missed > 0)
    .map((row) => ({
      concept: row.concept,
      missed: row.missed,
      seen: row.seen,
      attemptAccuracyPct:
        row.seen > 0 ? Math.round(((row.seen - row.missed) / row.seen) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        b.missed - a.missed ||
        a.attemptAccuracyPct - b.attemptAccuracyPct ||
        a.concept.localeCompare(b.concept),
    );
}

/**
 * Mastery is plain accuracy over everything recorded for a concept.
 *
 * Deliberately not a decaying or weighted average. This number is shown to the
 * person it describes and used to decide whether to stop drilling them, so it
 * has to be a number they can check by counting. A clever formula that nobody
 * can reproduce is a number nobody trusts.
 */
export function masteryPct(tally: { seen: number; correct: number }): number {
  if (!tally || tally.seen <= 0) return 0;
  const pct = (tally.correct / tally.seen) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * The band a mastery percentage falls in.
 *
 * Nothing is called mastered on a single lucky answer: under three recorded
 * answers the ceiling is Developing, because two out of two is not evidence.
 */
export function masteryBand(pct: number, seen = 0): MasteryBand {
  if (seen < 3) return pct >= 50 ? 'DEVELOPING' : 'FRAGILE';
  if (pct >= 90) return 'MASTERED';
  if (pct >= 70) return 'SOLID';
  if (pct >= 40) return 'DEVELOPING';
  return 'FRAGILE';
}

/**
 * Whether recent answers are better than earlier ones.
 *
 * Compares the last three against everything before them. Anything shorter is
 * noise, so a short history reports "flat" rather than inventing a direction.
 */
export function masteryTrend(history: ConceptEvent[]): 'UP' | 'DOWN' | 'FLAT' {
  if (!history || history.length < 4) return 'FLAT';

  const recent = history.slice(-3);
  const earlier = history.slice(0, -3);

  const rate = (rows: ConceptEvent[]) =>
    rows.length ? rows.filter((r) => r.correct).length / rows.length : 0;

  const delta = rate(recent) - rate(earlier);
  if (delta >= 0.2) return 'UP';
  if (delta <= -0.2) return 'DOWN';
  return 'FLAT';
}

/**
 * Folds a set of new answers into the running tallies.
 *
 * Returns new objects rather than mutating, so a caller can compare before and
 * after to report what moved — which is the whole point of the loop's last
 * step.
 */
export function applyOutcomes(
  existing: ConceptTally[],
  outcomes: AnswerOutcome[],
): ConceptTally[] {
  const byKey = new Map<string, ConceptTally>();
  for (const row of existing || []) {
    byKey.set(conceptKey(row.concept), { ...row });
  }

  for (const outcome of outcomes) {
    for (const concept of outcome.concepts) {
      const key = conceptKey(concept);
      if (!key) continue;
      const row = byKey.get(key) || { concept, seen: 0, correct: 0 };
      row.seen += 1;
      if (outcome.isCorrect) row.correct += 1;
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values());
}

/**
 * How many practice questions a set of weak concepts deserves.
 *
 * Three per concept is enough to tell a lucky guess from knowing it, and the
 * ceiling keeps a bad attempt from producing a second exam — the loop is meant
 * to be the short way back, not a punishment.
 */
export function practiceSizeFor(weakConceptCount: number, max = 9): number {
  if (weakConceptCount <= 0) return 0;
  return Math.min(max, weakConceptCount * 3);
}
