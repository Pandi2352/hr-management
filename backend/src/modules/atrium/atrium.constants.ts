/**
 * Accent palette.
 *
 * Colour is a wayfinding aid here, not decoration: the same person carries the
 * same hue in the directory, on their profile, and in a followers list, so they
 * become recognisable before their name is read. Assigned once at profile
 * creation and stored, so a rename does not reshuffle everyone's colour.
 *
 * The keys are the contract between backend and frontend; the actual colour
 * values live in the UI, where they belong.
 */
export const ATRIUM_ACCENTS = [
  'indigo',
  'violet',
  'fuchsia',
  'rose',
  'orange',
  'amber',
  'lime',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
] as const;

export type AtriumAccent = (typeof ATRIUM_ACCENTS)[number];

/**
 * Deterministic accent from a stable id.
 *
 * Derived from the employee id rather than the name, so the colour survives a
 * rename. Only used to seed a profile; after that the stored value wins.
 */
export function accentForId(id: string): AtriumAccent {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ATRIUM_ACCENTS[hash % ATRIUM_ACCENTS.length];
}

/** Employment states that should not appear in a social directory. */
export const INACTIVE_EMPLOYEE_STATUSES = ['TERMINATED', 'RESIGNED', 'INACTIVE'];
