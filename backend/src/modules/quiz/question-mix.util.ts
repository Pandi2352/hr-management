import { QUESTION_TYPES, type QuestionType } from './question-grading.util';

/**
 * How many of each kind of question an author asked for.
 *
 * Pure and tested on its own, because this decides what gets generated and how
 * many calls it takes. Getting it wrong produces either a quiz that is short of
 * what was ordered or a run of pointless requests.
 */
export type QuestionMix = Partial<Record<QuestionType, number>>;

/** One batch of work: this many questions, all of this type. */
export interface MixSlice {
  type: QuestionType;
  count: number;
}

/**
 * The mix used when the author did not choose one.
 *
 * Mostly single choice, because that is what most assessment is, with one of
 * each of the others once a quiz is long enough to carry them. A quiz of three
 * questions with one of every type tests nothing properly.
 */
export function defaultMix(total: number): QuestionMix {
  if (total <= 0) return {};
  if (total <= 3) return { SINGLE: total };

  if (total <= 6) {
    return { SINGLE: total - 2, MULTI: 1, TRUE_FALSE: 1 };
  }

  const trueFalse = Math.max(1, Math.round(total * 0.15));
  const multi = Math.max(1, Math.round(total * 0.2));
  const fill = Math.max(1, Math.round(total * 0.1));
  const single = total - trueFalse - multi - fill;

  // If rounding ate the whole quiz, fall back to something obviously sane
  // rather than emitting a negative count.
  if (single < 1) return { SINGLE: total };

  return { SINGLE: single, MULTI: multi, TRUE_FALSE: trueFalse, FILL_BLANK: fill };
}

/** What the mix adds up to. */
export function mixTotal(mix: QuestionMix | undefined): number {
  return Object.values(mix || {}).reduce((sum, n) => sum + (Number(n) > 0 ? Number(n) : 0), 0);
}

/**
 * The mix to actually generate, reconciled against the requested total.
 *
 * An author who typed a mix adding to seven and a total of five meant one of
 * the two; silently generating seven questions for a quiz labelled five is the
 * worse guess. The total wins, and the mix is scaled to fit it, because the
 * total is what the rest of the quiz — its duration, its XP — was sized
 * against.
 */
export function normalizeMix(total: number, requested?: QuestionMix): QuestionMix {
  const wanted = Math.max(0, Math.floor(Number(total) || 0));
  if (wanted === 0) return {};

  const cleaned: QuestionMix = {};
  for (const type of QUESTION_TYPES) {
    const n = Math.floor(Number(requested?.[type]) || 0);
    if (n > 0) cleaned[type] = n;
  }

  const asked = mixTotal(cleaned);
  if (asked === 0) return defaultMix(wanted);
  if (asked === wanted) return cleaned;

  // Scale proportionally, then settle the rounding remainder on the largest
  // group so the parts always add up to the whole.
  const scaled: QuestionMix = {};
  let running = 0;
  const entries = Object.entries(cleaned) as [QuestionType, number][];

  entries.forEach(([type, n], i) => {
    if (i === entries.length - 1) {
      scaled[type] = Math.max(0, wanted - running);
      return;
    }
    const share = Math.max(0, Math.round((n / asked) * wanted));
    scaled[type] = share;
    running += share;
  });

  // Scaling down can zero a type out entirely; drop it rather than asking for
  // nought of something.
  for (const type of QUESTION_TYPES) {
    if (scaled[type] === 0) delete scaled[type];
  }

  const settled = mixTotal(scaled);
  if (settled !== wanted) {
    const first = (Object.keys(scaled)[0] as QuestionType) || 'SINGLE';
    scaled[first] = (scaled[first] || 0) + (wanted - settled);
    if ((scaled[first] || 0) <= 0) delete scaled[first];
  }

  return mixTotal(scaled) === wanted ? scaled : defaultMix(wanted);
}

/**
 * The mix as work to do, largest group first.
 *
 * Split into slices no larger than `batchSize`, and ordered so the most
 * numerous type is written first: if a run has to stop early, what exists is
 * still a usable quiz rather than three odd questions and nothing else.
 */
export function mixToSlices(mix: QuestionMix, batchSize: number): MixSlice[] {
  const size = Math.max(1, Math.floor(batchSize));

  const ordered = (Object.entries(mix) as [QuestionType, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const slices: MixSlice[] = [];
  for (const [type, count] of ordered) {
    let left = count;
    while (left > 0) {
      const take = Math.min(size, left);
      slices.push({ type, count: take });
      left -= take;
    }
  }

  return slices;
}

export const MIX_LABELS: Record<QuestionType, string> = {
  SINGLE: 'single choice',
  MULTI: 'multiple answers',
  TRUE_FALSE: 'true or false',
  FILL_BLANK: 'fill in the blank',
};

/** The mix in words, for a log line or a message back to the author. */
export function describeMix(mix: QuestionMix): string {
  const parts = (Object.entries(mix) as [QuestionType, number][])
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${MIX_LABELS[type]}`);

  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * What is still owed, after a run produced what it produced.
 *
 * This is what makes "I asked for five and got two" recoverable: the shortfall
 * is a new, smaller order rather than a failure.
 */
export function outstandingMix(
  wanted: QuestionMix,
  produced: { type: QuestionType }[],
): QuestionMix {
  const have: Record<string, number> = {};
  for (const q of produced) {
    have[q.type] = (have[q.type] || 0) + 1;
  }

  const owed: QuestionMix = {};
  for (const type of QUESTION_TYPES) {
    const short = (wanted[type] || 0) - (have[type] || 0);
    if (short > 0) owed[type] = short;
  }

  return owed;
}
