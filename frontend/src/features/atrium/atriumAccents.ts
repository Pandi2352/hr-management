import type { AtriumAccent } from './types/atrium.types';

export interface AccentTokens {
  /** Solid fill for the card's colour block. */
  block: string;
  /** Quiet wash for chips and panels. */
  soft: string;
  /** Readable text in both themes. */
  text: string;
  border: string;
  /** Filled control — the "following" state. */
  solid: string;
  /** Selected state in the accent picker. */
  ring: string;
  label: string;
}

/**
 * The Atrium palette.
 *
 * Written as literal class strings rather than composed from the accent name:
 * Tailwind scans source text, so an interpolated `bg-${accent}-500` is never
 * generated and every card would render grey.
 *
 * Colour here is identity, not decoration — a person keeps one hue across the
 * directory, their profile and every followers list, so they become
 * recognisable before their name is read. It is never the only signal: the name
 * and role are always present.
 */
export const ATRIUM_ACCENT_TOKENS: Record<AtriumAccent, AccentTokens> = {
  indigo: {
    block: 'bg-indigo-500',
    soft: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-600 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-900',
    solid: 'bg-indigo-600 text-white border-indigo-600',
    ring: 'ring-indigo-500',
    label: 'Indigo',
  },
  violet: {
    block: 'bg-violet-500',
    soft: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-900',
    solid: 'bg-violet-600 text-white border-violet-600',
    ring: 'ring-violet-500',
    label: 'Violet',
  },
  fuchsia: {
    block: 'bg-fuchsia-500',
    soft: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    text: 'text-fuchsia-600 dark:text-fuchsia-300',
    border: 'border-fuchsia-200 dark:border-fuchsia-900',
    solid: 'bg-fuchsia-600 text-white border-fuchsia-600',
    ring: 'ring-fuchsia-500',
    label: 'Fuchsia',
  },
  rose: {
    block: 'bg-rose-500',
    soft: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-900',
    solid: 'bg-rose-600 text-white border-rose-600',
    ring: 'ring-rose-500',
    label: 'Rose',
  },
  orange: {
    block: 'bg-orange-500',
    soft: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900',
    solid: 'bg-orange-600 text-white border-orange-600',
    ring: 'ring-orange-500',
    label: 'Orange',
  },
  amber: {
    block: 'bg-amber-500',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    solid: 'bg-amber-500 text-white border-amber-500',
    ring: 'ring-amber-500',
    label: 'Amber',
  },
  lime: {
    block: 'bg-lime-500',
    soft: 'bg-lime-50 dark:bg-lime-950/40',
    text: 'text-lime-600 dark:text-lime-300',
    border: 'border-lime-200 dark:border-lime-900',
    solid: 'bg-lime-600 text-white border-lime-600',
    ring: 'ring-lime-500',
    label: 'Lime',
  },
  emerald: {
    block: 'bg-emerald-500',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-900',
    solid: 'bg-emerald-600 text-white border-emerald-600',
    ring: 'ring-emerald-500',
    label: 'Emerald',
  },
  teal: {
    block: 'bg-teal-500',
    soft: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-600 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-900',
    solid: 'bg-teal-600 text-white border-teal-600',
    ring: 'ring-teal-500',
    label: 'Teal',
  },
  cyan: {
    block: 'bg-cyan-500',
    soft: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-600 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-900',
    solid: 'bg-cyan-600 text-white border-cyan-600',
    ring: 'ring-cyan-500',
    label: 'Cyan',
  },
  sky: {
    block: 'bg-sky-500',
    soft: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-600 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-900',
    solid: 'bg-sky-600 text-white border-sky-600',
    ring: 'ring-sky-500',
    label: 'Sky',
  },
  blue: {
    block: 'bg-blue-500',
    soft: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900',
    solid: 'bg-blue-600 text-white border-blue-600',
    ring: 'ring-blue-500',
    label: 'Blue',
  },
};

/** Falls back to indigo for an unknown key rather than rendering unstyled. */
export function accentTokens(accent?: string): AccentTokens {
  return ATRIUM_ACCENT_TOKENS[(accent as AtriumAccent) ?? 'indigo'] ?? ATRIUM_ACCENT_TOKENS.indigo;
}

/** Up to two initials — the monogram that anchors every card. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
