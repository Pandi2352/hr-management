import { Robot, SealCheck, Sparkle, UserPlus } from '@phosphor-icons/react';
import { AtriumGlyph } from '../../../features/atrium/icons/AtriumIcons';

/**
 * What lives on the right-hand rail.
 *
 * This file is the whole contract. Adding a spotlight feature later is one
 * entry here and nothing else — no edit to the rail component, no layout
 * change, no new colour class to remember.
 *
 * The rail is for *special* features: the cross-cutting, high-interest parts of
 * the product that do not belong to one department's day-to-day work. The left
 * sidebar already lists everything; this one is a short list on purpose. Past
 * about eight entries it stops being a spotlight and becomes a second menu, at
 * which point the answer is to promote something into the left sidebar instead.
 */

export interface SpotlightItem {
  id: string;
  label: string;
  /** One line, shown under the label in the tooltip. */
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string; weight?: any }>;
  /** Palette key from `SPOTLIGHT_TINTS`. Each feature owns one. */
  tint: string;
  /** Matches only the exact path, for a destination that is also a prefix. */
  exact?: boolean;
  /** Renders a count on the tile. Wire to real data when there is some. */
  badge?: number;
  /** Marks a destination that is visible but not built yet. */
  soon?: boolean;
}

/**
 * The rail's palette.
 *
 * Written as literal class strings rather than composed from the tint name:
 * Tailwind scans source text, so an interpolated `bg-${tint}-500` is never
 * generated and every tile would render grey.
 *
 * Three states per colour. `idle` is the icon alone, which is how a tile sits
 * at rest. `hover` adds the faintest wash. `active` fills the tile, because the
 * page you are on should be the only saturated thing in the strip.
 */
export const SPOTLIGHT_TINTS: Record<
  string,
  { idle: string; hover: string; active: string; dot: string }
> = {
  fuchsia: {
    idle: 'text-fuchsia-600 dark:text-fuchsia-400',
    hover: 'hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40',
    active: 'bg-fuchsia-600 text-white',
    dot: 'bg-fuchsia-600',
  },
  violet: {
    idle: 'text-violet-600 dark:text-violet-400',
    hover: 'hover:bg-violet-50 dark:hover:bg-violet-950/40',
    active: 'bg-violet-600 text-white',
    dot: 'bg-violet-600',
  },
  sky: {
    idle: 'text-sky-600 dark:text-sky-400',
    hover: 'hover:bg-sky-50 dark:hover:bg-sky-950/40',
    active: 'bg-sky-600 text-white',
    dot: 'bg-sky-600',
  },
  emerald: {
    idle: 'text-emerald-600 dark:text-emerald-400',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
    active: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-600',
  },
  amber: {
    idle: 'text-amber-600 dark:text-amber-400',
    hover: 'hover:bg-amber-50 dark:hover:bg-amber-950/40',
    active: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  rose: {
    idle: 'text-rose-600 dark:text-rose-400',
    hover: 'hover:bg-rose-50 dark:hover:bg-rose-950/40',
    active: 'bg-rose-600 text-white',
    dot: 'bg-rose-600',
  },
};

export const SPOTLIGHT_ITEMS: SpotlightItem[] = [
  {
    id: 'atrium',
    label: 'Atrium',
    hint: 'Colleagues, profiles and who you follow',
    href: '/atrium',
    icon: AtriumGlyph,
    tint: 'fuchsia',
  },
  {
    id: 'ai-providers',
    label: 'AI Providers',
    hint: 'Models, keys and provider health',
    href: '/settings/ai-providers',
    icon: Robot,
    tint: 'violet',
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    hint: 'Pipeline, candidates and AI scoring',
    href: '/recruitment',
    icon: UserPlus,
    tint: 'sky',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    hint: 'Everything waiting on you',
    href: '/approvals',
    icon: SealCheck,
    tint: 'amber',
    soon: true,
  },
];

/** The mark at the top of the rail, above the first divider. */
export const SPOTLIGHT_BRAND = {
  icon: Sparkle,
  label: 'Spotlight',
  hint: 'The parts of PeopleOS worth a shortcut',
};
