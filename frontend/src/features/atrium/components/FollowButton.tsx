import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useToast } from '../../../components/ui/toast';
import { atriumApi } from '../api/atrium.api';
import { publishFollowChange } from '../atriumEvents';
import {
  AtriumFollowGlyph,
  AtriumFollowingGlyph,
  AtriumUnfollowGlyph,
} from '../icons/AtriumIcons';
import type { AtriumProfile } from '../types/atrium.types';

interface FollowButtonProps {
  profile: AtriumProfile;
  onChange: (patch: { isFollowing: boolean; followerCount: number }) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Follow / following toggle.
 *
 * Optimistic, with a rollback: the button flips immediately because a follow
 * that waits on a round trip feels broken, but the previous state is captured
 * first so a failure restores it rather than leaving the UI lying.
 *
 * The server's returned count wins over the local guess — two people following
 * at once would otherwise each show their own arithmetic.
 */
export function FollowButton({ profile, onChange, size = 'md', className }: FollowButtonProps) {
  const toast = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Yourself, or a login with no employee record: the server would refuse, so
  // the button is not offered at all.
  if (profile.isSelf || profile.viewerCanFollow === false) return null;

  const handleClick = async () => {
    if (isBusy) return;

    const previous = { isFollowing: profile.isFollowing, followerCount: profile.followerCount };
    const next = !profile.isFollowing;

    onChange({
      isFollowing: next,
      followerCount: Math.max(0, profile.followerCount + (next ? 1 : -1)),
    });
    setIsBusy(true);

    try {
      const result = next
        ? await atriumApi.follow(profile.employeeId)
        : await atriumApi.unfollow(profile.employeeId);
      onChange({ isFollowing: result.following, followerCount: result.followerCount });
      // Tell the rest of the screen. Only confirmed state is published, so a
      // failure below rolls back this button alone.
      publishFollowChange({
        employeeId: profile.employeeId,
        isFollowing: result.following,
        followerCount: result.followerCount,
      });
    } catch (err: any) {
      onChange(previous);
      toast.error(
        err?.response?.data?.message || 'That did not go through. Try again.',
        next ? 'Could not follow' : 'Could not unfollow',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const following = profile.isFollowing;

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={isBusy}
      aria-pressed={following}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border font-semibold transition-colors disabled:opacity-60',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        /*
         * The app's own theme colour, not the person's accent and not a
         * hard-coded hue. `--primary` is what the customizer changes, so this
         * button restyles with the rest of the product instead of drifting away
         * from it the moment someone picks a different theme.
         *
         * Follow is the single action on a card, so it is the one thing that
         * should be saturated — and identical on every card, or a grid of
         * thirty-five buttons in thirty-five colours becomes the patchwork the
         * cards were just rescued from.
         */
        following
          ? hovering
            ? // The pointer has arrived and clicking now undoes it, so the
              // button says so before the click rather than after.
              'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-primary/30 bg-primary-light text-primary'
          : 'border-primary bg-primary text-white hover:bg-primary-hover hover:border-primary-hover',
        className,
      )}
    >
      {isBusy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        hovering ? (
          <AtriumUnfollowGlyph className="h-3.5 w-3.5" />
        ) : (
          <AtriumFollowingGlyph className="h-3.5 w-3.5" />
        )
      ) : (
        <AtriumFollowGlyph className="h-3.5 w-3.5" />
      )}
      <span>{following ? (hovering ? 'Unfollow' : 'Following') : 'Follow'}</span>
    </button>
  );
}
