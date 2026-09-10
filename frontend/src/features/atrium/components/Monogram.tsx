import { cn } from '../../../utils/cn';
import { initialsOf } from '../atriumAccents';
import type { AtriumProfile } from '../types/atrium.types';

/**
 * A person's picture, or their initials when there is none.
 *
 * One component because the fallback has to be identical everywhere: a face in
 * the directory and a different-looking square in the followers list would read
 * as two different people.
 *
 * The fallback is deliberately neutral. It used to be filled with the person's
 * accent, which turned a page of thirty-five colleagues into a grid of clashing
 * colour blocks and drowned out the photographs that are the actual content.
 * Colour now identifies a person only where there is one of them on screen.
 */
export function Monogram({
  profile,
  className,
  textClassName = 'text-xs',
  variant = 'neutral',
}: {
  profile: Pick<AtriumProfile, 'displayName' | 'accent' | 'photoUrl'>;
  className?: string;
  textClassName?: string;
  /** `onDark` for a monogram sitting on a cover photo or a filled header. */
  variant?: 'neutral' | 'onDark';
}) {
  if (profile.photoUrl) {
    return (
      <img
        src={profile.photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        // `block` because an inline image sits on the text baseline and leaves a
        // few stray pixels under it inside a sized box.
        className={cn('block h-full w-full object-cover object-center', className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex select-none items-center justify-center font-bold leading-none',
        variant === 'onDark' ? 'bg-white/20 text-white' : 'bg-surface-2 text-ink-2',
        textClassName,
        className,
      )}
    >
      {initialsOf(profile.displayName)}
    </span>
  );
}

/** The mood badge. Renders nothing when the person has not set one today. */
export function MoodBadge({
  profile,
  className,
  compact,
}: {
  profile: Pick<AtriumProfile, 'accent' | 'mood'>;
  className?: string;
  compact?: boolean;
}) {
  if (!profile.mood) return null;
  const { emoji, text } = profile.mood;

  if (compact) {
    return (
      <span
        title={text}
        className={cn('inline-flex h-5 w-5 items-center justify-center text-[11px]', className)}
      >
        {emoji || '💬'}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-2',
        className,
      )}
    >
      <span className="text-[11px] leading-none">{emoji || '💬'}</span>
      {text && <span className="truncate">{text}</span>}
    </span>
  );
}
