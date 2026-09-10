/**
 * The Atrium icon set.
 *
 * Hand-drawn SVGs rather than a library import, because Atrium needs to look
 * like its own place inside the product. Every other destination in the rail
 * uses the shared Phosphor set; these glyphs are the one exception, so the
 * feature is recognisable before its label is read.
 *
 * Three rules hold the set together:
 *  - one 24x24 grid, 1.5 stroke, round caps and joins, so they sit level with
 *    the Phosphor icons they share a rail with;
 *  - `currentColor` everywhere, so the sidebar's per-destination tint and the
 *    accent palette both flow straight through;
 *  - a `weight` prop matching the Phosphor signature, so these drop into the
 *    sidebar's renderer with no special-casing. "duotone" and "fill" add a soft
 *    wash to the shape's interior, which is how the rail marks the active page.
 */

export interface AtriumIconProps {
  className?: string;
  /** Accepted for Phosphor compatibility; "duotone"/"fill" tint the interior. */
  weight?: string;
  size?: number | string;
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const isFilled = (weight?: string) => weight === 'duotone' || weight === 'fill';

/**
 * The Atrium mark — a building's open central court seen from above.
 *
 * An atrium is the void a building is arranged around, so the glyph is a ring
 * with a hole in it and three people standing at its edge. Deliberately not the
 * three-person cluster every product uses for "team": the empty middle is the
 * whole idea, and it survives being drawn at 16 pixels.
 */
export function AtriumGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* The court itself, lit when active */}
      {isFilled(weight) && (
        <rect x="8.5" y="8.5" width="7" height="7" rx="2.4" fill="currentColor" opacity="0.24" />
      )}
      <rect x="3" y="3" width="18" height="18" rx="4.6" {...STROKE} />
      <rect x="8.5" y="8.5" width="7" height="7" rx="2.4" {...STROKE} strokeWidth={1.35} />
      {/* Three people around the edge */}
      <circle cx="12" cy="5.85" r="1.15" fill="currentColor" />
      <circle cx="6.3" cy="17.7" r="1.15" fill="currentColor" />
      <circle cx="17.7" cy="17.7" r="1.15" fill="currentColor" />
    </svg>
  );
}

/**
 * "Ask me about" — a question bubble with a spark inside it.
 *
 * The bubble says this is something you approach a person with; the spark says
 * it is the good part, not an admin field.
 */
export function AtriumSparkGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  const bubble = 'M8 4.2h8a3.8 3.8 0 0 1 3.8 3.8v4.6a3.8 3.8 0 0 1-3.8 3.8h-2.7l-3.6 3.3v-3.3H8a3.8 3.8 0 0 1-3.8-3.8V8A3.8 3.8 0 0 1 8 4.2Z';
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {isFilled(weight) && <path d={bubble} fill="currentColor" opacity="0.2" />}
      <path d={bubble} {...STROKE} />
      {/* Four-point spark, drawn with curves so the rays taper */}
      <path
        d="M12 7.1c.35 1.9.9 2.45 2.8 2.8-1.9.35-2.45.9-2.8 2.8-.35-1.9-.9-2.45-2.8-2.8 1.9-.35 2.45-.9 2.8-2.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Followers and following — a person with someone in orbit around them.
 *
 * Follow counts in a workplace are about who circles whom, not a score, so the
 * glyph is an orbit rather than a stack of avatars or a number badge.
 */
export function AtriumOrbitGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse
        cx="12"
        cy="12"
        rx="8.6"
        ry="4.4"
        transform="rotate(-28 12 12)"
        {...STROKE}
        strokeWidth={1.35}
      />
      <circle cx="12" cy="12" r="2.9" {...STROKE} fill={isFilled(weight) ? 'currentColor' : 'none'} />
      <circle cx="19.6" cy="7.9" r="1.35" fill="currentColor" />
    </svg>
  );
}

/**
 * Interests, the "outside work" half of a profile — a sprout.
 *
 * Growth rather than a heart: what someone does off the clock is a side of them
 * that is still developing, and a heart would read as a "like" control.
 */
export function AtriumSproutGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  const leafL = 'M12 14.2c-3.6 0-6.2-2.6-6.2-6.2 3.6 0 6.2 2.6 6.2 6.2Z';
  const leafR = 'M12 11.6c0-3.6 2.6-6.2 6.2-6.2 0 3.6-2.6 6.2-6.2 6.2Z';
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {isFilled(weight) && (
        <>
          <path d={leafL} fill="currentColor" opacity="0.22" />
          <path d={leafR} fill="currentColor" opacity="0.22" />
        </>
      )}
      <path d={leafL} {...STROKE} />
      <path d={leafR} {...STROKE} />
      <path d="M12 20.6v-9" {...STROKE} />
    </svg>
  );
}

/**
 * Discover — a compass rose pointing somewhere you have not been.
 *
 * Used for the tab that shows colleagues you are not following yet.
 */
export function AtriumCompassGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {isFilled(weight) && <circle cx="12" cy="12" r="8.8" fill="currentColor" opacity="0.18" />}
      <circle cx="12" cy="12" r="8.8" {...STROKE} />
      <path d="M15.4 8.6 13.7 13.7 8.6 15.4l1.7-5.1 5.1-1.7Z" {...STROKE} strokeWidth={1.35} />
    </svg>
  );
}

/**
 * Follow — a person entering someone's orbit.
 *
 * The generic plus says "add a record". Following a colleague is not that: it
 * is choosing to keep someone in view, which is what the orbit draws. The plus
 * survives only as the small mark on the satellite, so the action still reads
 * as additive at a glance.
 */
export function AtriumFollowGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse
        cx="11"
        cy="12.5"
        rx="7.6"
        ry="3.9"
        transform="rotate(-28 11 12.5)"
        {...STROKE}
        strokeWidth={1.35}
      />
      <circle
        cx="11"
        cy="12.5"
        r="2.7"
        {...STROKE}
        fill={isFilled(weight) ? 'currentColor' : 'none'}
      />
      <path d="M19 3.6v4.8M16.6 6h4.8" {...STROKE} strokeWidth={1.7} />
    </svg>
  );
}

/** Following — the same orbit, with the satellite settled into place. */
export function AtriumFollowingGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse
        cx="11"
        cy="12.5"
        rx="7.6"
        ry="3.9"
        transform="rotate(-28 11 12.5)"
        {...STROKE}
        strokeWidth={1.35}
      />
      <circle
        cx="11"
        cy="12.5"
        r="2.7"
        {...STROKE}
        fill={isFilled(weight) ? 'currentColor' : 'none'}
      />
      <path d="m16.4 6.1 1.9 1.9 3.3-3.9" {...STROKE} strokeWidth={1.7} />
    </svg>
  );
}

/** Unfollow — the orbit opened, the satellite leaving. */
export function AtriumUnfollowGlyph({ className = 'h-5 w-5' }: AtriumIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse
        cx="11"
        cy="12.5"
        rx="7.6"
        ry="3.9"
        transform="rotate(-28 11 12.5)"
        {...STROKE}
        strokeWidth={1.35}
        strokeDasharray="4 3"
      />
      <circle cx="11" cy="12.5" r="2.7" {...STROKE} />
      <path d="M16.6 6h4.8" {...STROKE} strokeWidth={1.7} />
    </svg>
  );
}

/**
 * Edit your profile — a nib with a spark, not a pencil.
 *
 * Every other edit control in the product is a pencil. This one is about
 * writing the version of yourself other people read, so it borrows the spark
 * that marks the rest of Atrium's self-authored fields.
 */
export function AtriumEditGlyph({ className = 'h-5 w-5', weight }: AtriumIconProps) {
  const nib = 'M14.6 4.9 19.1 9.4 9.6 18.9l-5.2.7.7-5.2 9.5-9.5Z';
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {isFilled(weight) && <path d={nib} fill="currentColor" opacity="0.2" />}
      <path d={nib} {...STROKE} />
      <path d="m12.4 7.1 4.5 4.5" {...STROKE} strokeWidth={1.35} />
      <path
        d="M19.6 2.4c.2 1.15.55 1.5 1.7 1.7-1.15.2-1.5.55-1.7 1.7-.2-1.15-.55-1.5-1.7-1.7 1.15-.2 1.5-.55 1.7-1.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
