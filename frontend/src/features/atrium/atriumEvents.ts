import type { AtriumProfile } from './types/atrium.types';

/**
 * Follow changes broadcast on the window.
 *
 * The mosaic and the right rail both show the same people, so a follow in one
 * has to move the other. They are siblings rather than parent and child, and a
 * context provider for two consumers would be more machinery than the problem
 * deserves — the codebase already syncs the sidebar's avatar and the org logo
 * this way.
 *
 * Only confirmed server state is published. The optimistic flip stays local to
 * the button that was pressed, so a failed request rolls back one control
 * instead of flickering the whole screen.
 */
const FOLLOW_CHANGED = 'atrium_follow_changed';

export interface AtriumFollowChange {
  employeeId: string;
  isFollowing: boolean;
  followerCount: number;
}

export function publishFollowChange(change: AtriumFollowChange) {
  window.dispatchEvent(new CustomEvent<AtriumFollowChange>(FOLLOW_CHANGED, { detail: change }));
}

/** Subscribes to follow changes. Returns the unsubscribe function. */
export function onFollowChange(handler: (change: AtriumFollowChange) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<AtriumFollowChange>).detail);
  window.addEventListener(FOLLOW_CHANGED, listener);
  return () => window.removeEventListener(FOLLOW_CHANGED, listener);
}

/** Applies a change to a list of profiles, leaving the array alone if nobody matches. */
export function applyFollowChange(
  profiles: AtriumProfile[],
  change: AtriumFollowChange,
): AtriumProfile[] {
  if (!profiles.some((p) => p.employeeId === change.employeeId)) return profiles;
  return profiles.map((p) =>
    p.employeeId === change.employeeId
      ? { ...p, isFollowing: change.isFollowing, followerCount: change.followerCount }
      : p,
  );
}
