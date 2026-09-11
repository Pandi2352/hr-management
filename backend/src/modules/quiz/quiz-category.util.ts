/**
 * Keeping the quiz category list from turning into a pile of near-duplicates.
 *
 * Categories are free text, and both a person typing and a model generating
 * will happily produce "Information Security", "information security" and
 * "Info Security" for the same thing. Three spellings means three filter
 * entries, three sets of analytics, and a category filter nobody trusts.
 *
 * There is no separate category collection on purpose. A category exists
 * because a quiz uses it, so the list cleans itself up when the last quiz in a
 * category is deleted, and there is no second store to keep in sync.
 */

/** Longest first, so "info sec" is not eaten by the "sec" rule. */
const ALIASES: [RegExp, string][] = [
  [/^info(rmation)?\s*sec(urity)?$/i, 'Information Security'],
  [/^(cyber\s*)?security$/i, 'Information Security'],
  [/^data\s*(privacy|protection)$/i, 'Data Privacy'],
  [/^compliance(\s*(&|and)\s*safety)?$/i, 'Compliance & Safety'],
  [/^(health\s*(&|and)\s*)?safety$/i, 'Compliance & Safety'],
  [/^hr$/i, 'People Operations'],
  [/^people\s*ops$/i, 'People Operations'],
  [/^leadership(\s*(&|and)\s*culture)?$/i, 'Leadership & Culture'],
  [/^(product|tech(nology)?)(\s*(&|and)\s*(product|tech(nology)?))?$/i, 'Product & Technology'],
  [/^(customer|client)\s*(experience|service|support)$/i, 'Customer Experience'],
  [/^onboarding(\s*(&|and)\s*induction)?$/i, 'Onboarding'],
  [/^general(\s*knowledge)?$/i, 'General'],
];

/**
 * Cleans a category to its canonical spelling.
 *
 * Whitespace collapse, a small alias table for the obvious synonyms, then
 * title case. Title case is applied last so an unknown category still comes out
 * consistently capitalised rather than however it was typed.
 */
export function normalizeCategory(raw: string | undefined | null): string {
  const trimmed = (raw || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';

  for (const [pattern, canonical] of ALIASES) {
    if (pattern.test(trimmed)) return canonical;
  }

  // Words that stay lowercase inside a title, and the ampersand joining two
  // halves of a compound category.
  const small = new Set(['and', 'or', 'of', 'the', 'for', 'in', 'on', 'to', 'a', 'an']);
  return trimmed
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (word === '&') return '&';
      if (index > 0 && small.has(lower)) return lower;
      // Preserve an existing acronym rather than flattening it: GDPR, not Gdpr.
      if (word.length > 1 && word === word.toUpperCase()) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .slice(0, 60);
}

/**
 * Matches a proposed category against the ones already in use.
 *
 * Returns the existing spelling when they mean the same thing, so a new quiz
 * joins an existing category rather than starting a parallel one. Falls back to
 * the normalised proposal when it is genuinely new.
 *
 * Comparison strips everything but letters and digits, which is what makes
 * "Compliance & Safety", "compliance and safety" and "Compliance-Safety" land
 * on the same entry.
 */
export function reconcileCategory(proposed: string, existing: string[]): string {
  const normalized = normalizeCategory(proposed);
  if (!normalized) return 'General';

  const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = key(normalized);

  const match = existing.find((candidate) => key(candidate) === target);
  return match || normalized;
}
