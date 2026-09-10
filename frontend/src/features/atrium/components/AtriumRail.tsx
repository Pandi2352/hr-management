import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Tooltip } from '../../../components/ui/tooltip';
import { cn } from '../../../utils/cn';
import { atriumApi } from '../api/atrium.api';
import { accentTokens } from '../atriumAccents';
import { MoodBadge, Monogram } from './Monogram';
import { applyFollowChange, onFollowChange } from '../atriumEvents';
import {
  AtriumCompassGlyph,
  AtriumEditGlyph,
  AtriumGlyph,
  AtriumOrbitGlyph,
} from '../icons/AtriumIcons';
import { EditProfileDrawer } from './EditProfileDrawer';
import { FollowButton } from './FollowButton';
import { FollowListModal } from './FollowListModal';
import type { AtriumProfile } from '../types/atrium.types';

const COLLAPSE_KEY = 'atrium_rail_collapsed';
const FOLLOWING_PREVIEW = 6;
const SUGGESTION_COUNT = 4;

/**
 * The Atrium rail.
 *
 * A companion column that belongs to Atrium and appears nowhere else, so it is
 * styled against the left sidebar rather than matching it: no icon strip, no
 * nested groups, and no colour of its own. An earlier version ran a ribbon of
 * accent bands down its edge for everyone you follow; it was the prettiest idea
 * here and the wrong one, because a rail full of colour competes with the very
 * photographs the directory exists to show.
 *
 * It is self-sufficient: it fetches its own data and keeps in step with the
 * mosaic through follow events, so a page can drop it in without threading
 * state through.
 */
export function AtriumRail({ className }: { className?: string }) {
  const navigate = useNavigate();
  const requestSeq = useRef(0);

  const [me, setMe] = useState<AtriumProfile | null>(null);
  const [following, setFollowing] = useState<AtriumProfile[]>([]);
  const [suggestions, setSuggestions] = useState<AtriumProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listMode, setListMode] = useState<'followers' | 'following' | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1');
      return !prev;
    });
  };

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    try {
      const profile = await atriumApi.getMyProfile();
      if (seq !== requestSeq.current) return;
      setMe(profile);
      const [followingRes, suggested] = await Promise.all([
        atriumApi.getFollowing(profile.employeeId, { pageSize: 50 }),
        atriumApi.getSuggestions(SUGGESTION_COUNT),
      ]);
      if (seq !== requestSeq.current) return;
      setFollowing(followingRes.data || []);
      setSuggestions(suggested);
    } catch {
      // The rail is a companion, never the page. A failure here leaves the
      // directory perfectly usable, so it stays quiet rather than raising a
      // toast over content that loaded fine.
      setMe(null);
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Someone followed or unfollowed elsewhere on the page.
  useEffect(
    () =>
      onFollowChange((change) => {
        setSuggestions((prev) => applyFollowChange(prev, change));
        setFollowing((prev) => {
          const known = prev.some((p) => p.employeeId === change.employeeId);
          if (change.isFollowing && !known) {
            // Pull the new person in without a refetch, so the list grows at once.
            const source = suggestions.find((p) => p.employeeId === change.employeeId);
            return source ? [{ ...source, isFollowing: true }, ...prev] : prev;
          }
          if (!change.isFollowing && known) {
            return prev.filter((p) => p.employeeId !== change.employeeId);
          }
          return applyFollowChange(prev, change);
        });
        setMe((prev) =>
          prev ? { ...prev, followingCount: Math.max(0, prev.followingCount + (change.isFollowing ? 1 : -1)) } : prev,
        );
      }),
    [suggestions],
  );

  if (collapsed) {
    return (
      <div role="complementary" aria-label="Atrium rail" className={cn('shrink-0', className)}>
        <div className="sticky top-0 flex w-9 flex-col items-center gap-2 rounded-md border border-hairline bg-surface py-2">
          <Tooltip content="Show the Atrium rail" placement="left" delay={100}>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Show the Atrium rail"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <PanelRightOpen className="h-4 w-4" />
            </button>
          </Tooltip>

          {/* Collapsed, the rail is reduced to the one number worth keeping */}
          {following.length > 0 && (
            <div
              title={`You follow ${following.length}`}
              className="flex flex-col items-center gap-0.5 rounded-md bg-surface-2 px-1 py-1.5"
            >
              <AtriumOrbitGlyph className="h-3.5 w-3.5 text-ink-3" />
              <span className="text-[10px] font-bold tabular-nums text-ink-2">
                {following.length}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div role="complementary" aria-label="Atrium rail" className={cn('shrink-0', className)}>
      <div className="sticky top-0 space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-3">
            <AtriumGlyph className="h-3.5 w-3.5" />
            Your Atrium
          </span>
          <Tooltip content="Hide the rail" placement="left" delay={100}>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Hide the Atrium rail"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>

        {isLoading ? (
          <div className="rounded-md border border-hairline bg-surface py-12 text-center text-[11px] text-ink-3">
            <Loader2 className="mx-auto mb-1.5 h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !me ? (
          <div className="rounded-md border border-hairline bg-surface p-3 text-[11px] text-ink-3">
            Your login is not linked to an employee record yet, so your rail is empty.
          </div>
        ) : (
          <RailBody
            me={me}
            following={following}
            suggestions={suggestions}
            onOpenList={setListMode}
            onEdit={() => setIsEditOpen(true)}
            onOpen={(id) => navigate(`/atrium/${id}`)}
          />
        )}
      </div>

      {me && listMode && (
        <FollowListModal
          isOpen
          onClose={() => {
            setListMode(null);
            load();
          }}
          employeeId={me.employeeId}
          mode={listMode}
          ownerName="you"
        />
      )}

      {me && (
        <EditProfileDrawer
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          profile={me}
          onSaved={setMe}
        />
      )}
    </div>
  );
}

/** Split out so the loading and empty states above stay readable. */
function RailBody({
  me,
  following,
  suggestions,
  onOpenList,
  onEdit,
  onOpen,
}: {
  me: AtriumProfile;
  following: AtriumProfile[];
  suggestions: AtriumProfile[];
  onOpenList: (mode: 'followers' | 'following') => void;
  onEdit: () => void;
  onOpen: (employeeId: string) => void;
}) {
  const mine = accentTokens(me.accent);

  return (
    <div className="min-w-0 space-y-3">
      {/* You */}
      <div className="overflow-hidden rounded-md border border-hairline bg-surface">
        <div
          className={cn(
            'relative flex items-center gap-2.5 bg-cover bg-center p-2.5',
            !me.coverUrl && mine.block,
          )}
          style={me.coverUrl ? { backgroundImage: `url(${me.coverUrl})` } : undefined}
        >
          {me.coverUrl && <span className="absolute inset-0 bg-slate-900/45" />}
          <button
            type="button"
            onClick={() => onOpen(me.employeeId)}
            aria-label="Open my profile"
            className="relative shrink-0 cursor-pointer"
          >
            <Monogram
              profile={me}
              variant="onDark"
              className="h-10 w-10 rounded-md ring-1 ring-white/40"
              textClassName="text-sm"
            />
          </button>
          <div className="relative min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-bold text-white">{me.displayName}</div>
            <div className="truncate text-[10.5px] text-white/75">
              {me.designationTitle || 'Team member'}
            </div>
            {me.mood && (
              <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-white/90">
                <span className="leading-none">{me.mood.emoji || '💬'}</span>
                <span className="truncate">{me.mood.text}</span>
              </div>
            )}
          </div>
          <Tooltip content="Edit my profile" placement="left" delay={100}>
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit my profile"
              className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-white/20 text-white transition-colors hover:bg-white/35"
            >
              <AtriumEditGlyph className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline">
          {[
            { mode: 'followers' as const, label: 'Followers', value: me.followerCount },
            { mode: 'following' as const, label: 'Following', value: me.followingCount },
          ].map((stat) => (
            <button
              key={stat.mode}
              type="button"
              onClick={() => onOpenList(stat.mode)}
              className="cursor-pointer py-2 transition-colors hover:bg-surface-2"
            >
              <div className="text-[15px] font-bold tabular-nums text-ink">{stat.value}</div>
              <div className="text-[9.5px] uppercase tracking-[0.07em] text-ink-3">
                {stat.label}
              </div>
            </button>
          ))}
        </div>

        {!me.bio && me.askMeAbout.length === 0 && (
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              'block w-full cursor-pointer border-t border-hairline px-2.5 py-2 text-left text-[10.5px] font-semibold hover:underline',
              mine.text,
            )}
          >
            Your profile is blank. Add what you can be asked about.
          </button>
        )}
      </div>

      {/* Who you follow */}
      <RailSection
        icon={<AtriumOrbitGlyph className="h-3.5 w-3.5" />}
        title="You follow"
        count={me.followingCount}
        action={
          following.length > FOLLOWING_PREVIEW
            ? { label: 'See all', onClick: () => onOpenList('following') }
            : undefined
        }
      >
        {following.length === 0 ? (
          <p className="px-2 pb-2 text-[10.5px] text-ink-3">
            Nobody yet. Follow someone below and they show up here.
          </p>
        ) : (
          following.slice(0, FOLLOWING_PREVIEW).map((person) => (
            <PersonRow key={person.employeeId} person={person} onOpen={onOpen} />
          ))
        )}
      </RailSection>

      {/* Worth following */}
      {suggestions.some((s) => !s.isFollowing) && (
        <RailSection
          icon={<AtriumCompassGlyph className="h-3.5 w-3.5" />}
          title="Worth following"
        >
          {suggestions
            .filter((s) => !s.isFollowing)
            .map((person) => (
              <PersonRow key={person.employeeId} person={person} onOpen={onOpen} showFollow />
            ))}
        </RailSection>
      )}
    </div>
  );
}

function RailSection({
  icon,
  title,
  count,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-2 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
        {icon}
        <span>{title}</span>
        {count !== undefined && count > 0 && (
          <span className="tabular-nums text-ink-2">{count}</span>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="ml-auto cursor-pointer text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="px-1.5 pb-1.5">{children}</div>
    </div>
  );
}

function PersonRow({
  person,
  onOpen,
  showFollow,
}: {
  person: AtriumProfile;
  onOpen: (employeeId: string) => void;
  showFollow?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-surface-2">
      <button
        type="button"
        onClick={() => onOpen(person.employeeId)}
        aria-label={person.displayName}
        className="shrink-0 cursor-pointer"
      >
        <Monogram
          profile={person}
          className="h-7 w-7 rounded-md border border-hairline"
          textClassName="text-[10px]"
        />
      </button>

      <button
        type="button"
        onClick={() => onOpen(person.employeeId)}
        className="min-w-0 flex-1 cursor-pointer text-left"
      >
        <div className="truncate text-[11.5px] font-semibold text-ink">{person.displayName}</div>
        <div className="flex items-center gap-1">
          <span className="truncate text-[10px] text-ink-3">
            {person.designationTitle || 'Team member'}
          </span>
          <MoodBadge profile={person} compact className="shrink-0" />
        </div>
      </button>

      {showFollow && (
        <FollowButton
          profile={person}
          size="sm"
          // The rail listens for the broadcast, so the row needs no callback.
          onChange={() => undefined}
          className="shrink-0"
        />
      )}
    </div>
  );
}
