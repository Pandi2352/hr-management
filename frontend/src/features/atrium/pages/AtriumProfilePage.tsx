import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Loader2,
  MapPin,
  Mail,
} from 'lucide-react';
import { AtriumEditGlyph, AtriumSparkGlyph, AtriumSproutGlyph } from '../icons/AtriumIcons';
import { AtriumRail } from '../components/AtriumRail';
import { onFollowChange } from '../atriumEvents';
import { Button } from '../../../components/ui/Button';
import { useToastRef } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { atriumApi } from '../api/atrium.api';
import { accentTokens } from '../atriumAccents';
import { Monogram } from '../components/Monogram';
import { EditProfileDrawer } from '../components/EditProfileDrawer';
import { FollowButton } from '../components/FollowButton';
import { FollowListModal } from '../components/FollowListModal';
import type { AtriumProfile } from '../types/atrium.types';

/**
 * One person's page.
 *
 * Built around their accent block rather than a cover photo: the colour is the
 * identity signal used everywhere else in Atrium, so the profile has to open
 * with it. Facts sit under the block; the things the person chose to say about
 * themselves get the page below it.
 */
export function AtriumProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const toastRef = useToastRef();

  const [profile, setProfile] = useState<AtriumProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listMode, setListMode] = useState<'followers' | 'following' | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    try {
      setProfile(await atriumApi.getProfile(employeeId));
    } catch (err: any) {
      toastRef.current.error(
        err?.response?.data?.message || 'That profile is not available.',
        'Not found',
      );
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, toastRef]);

  useEffect(() => {
    load();
  }, [load]);

  // The rail can follow this same person, so mirror the confirmed state.
  useEffect(
    () =>
      onFollowChange((change) =>
        setProfile((prev) =>
          prev && prev.employeeId === change.employeeId
            ? { ...prev, isFollowing: change.isFollowing, followerCount: change.followerCount }
            : prev,
        ),
      ),
    [],
  );

  if (isLoading) {
    return (
      <div className="rounded-md border border-hairline bg-surface py-24 text-center text-xs text-ink-3">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-md border border-hairline bg-surface py-24 text-center">
        <p className="mb-3 text-xs text-ink-3">This colleague is not in the Atrium.</p>
        <Button variant="outline" onClick={() => navigate('/atrium')}>
          Back to the Atrium
        </Button>
      </div>
    );
  }

  const tokens = accentTokens(profile.accent);
  const firstName = profile.displayName.split(' ')[0];
  const facts = [
    { icon: Briefcase, label: profile.departmentName || 'Unassigned' },
    profile.location ? { icon: MapPin, label: profile.location } : null,
    profile.joinedMonthYear ? { icon: CalendarDays, label: 'Joined ' + profile.joinedMonthYear } : null,
    profile.workEmail ? { icon: Mail, label: profile.workEmail } : null,
  ].filter(Boolean) as { icon: typeof Briefcase; label: string }[];

  const stats = [
    { mode: 'followers' as const, label: 'Followers', value: profile.followerCount },
    { mode: 'following' as const, label: 'Following', value: profile.followingCount },
  ];

  return (
    <div className="flex w-full items-start gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/atrium')}
          className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Atrium
        </button>

        {/* The accent header: monogram, name, action */}
        <div className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div
            className={cn(
              'relative bg-cover bg-center px-5 py-6 sm:px-7 sm:py-8',
              !profile.coverUrl && tokens.block,
            )}
            style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})` } : undefined}
          >
            {/* A scrim only over a photo: names have to stay readable on top of
                someone's beach shot, and the flat accent needs no help. */}
            {profile.coverUrl && <div className="absolute inset-0 bg-slate-900/45" />}

            <div className="relative flex flex-wrap items-center gap-5">
              <Monogram
                profile={profile}
                variant="onDark"
                className="h-20 w-20 shrink-0 rounded-md border-2 border-white/40 sm:h-24 sm:w-24"
                textClassName="text-3xl sm:text-4xl"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
                    {profile.displayName}
                  </h1>
                  {profile.pronouns && (
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
                      {profile.pronouns}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] font-semibold text-white/90">
                  {profile.designationTitle || 'Team member'}
                </p>
                {profile.mood && (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-white/20 px-2 py-1 text-[11.5px] font-medium text-white">
                    <span className="text-sm leading-none">{profile.mood.emoji || '💬'}</span>
                    {profile.mood.text}
                  </span>
                )}
                <p className="text-[11.5px] text-white/70">{profile.employeeCode}</p>
              </div>

              {profile.isSelf ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpen(true)}
                  className="gap-1.5 border-white/40 bg-white/15 text-white hover:bg-white/25"
                >
                  <AtriumEditGlyph className="h-3.5 w-3.5" />
                  Edit
                </Button>
              ) : (
                <FollowButton
                  profile={profile}
                  onChange={(patch) => setProfile({ ...profile, ...patch })}
                  className="border-white/40 bg-white/15 text-white hover:bg-white/25"
                />
              )}
            </div>
          </div>

          {/* Counts sit directly under the block, clickable into the lists */}
          <div className="flex flex-wrap items-center gap-1 border-t border-hairline px-3 py-2">
            {stats.map((stat) => (
              <button
                key={stat.mode}
                type="button"
                onClick={() => setListMode(stat.mode)}
                className="cursor-pointer rounded-md px-3 py-1.5 text-left transition-colors hover:bg-surface-2"
              >
                <span className="text-sm font-bold tabular-nums text-ink">{stat.value}</span>
                <span className="ml-1.5 text-[11.5px] text-ink-3">{stat.label}</span>
              </button>
            ))}

            <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-[11.5px] text-ink-3">
              {facts.map((fact) => (
                <span key={fact.label} className="inline-flex items-center gap-1.5">
                  <fact.icon className="h-3.5 w-3.5" />
                  {fact.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Ask me about leads, because it is the useful half of a work profile */}
          <div className={cn('rounded-md border p-4 lg:col-span-2', tokens.border, tokens.soft)}>
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
              <AtriumSparkGlyph className="h-3.5 w-3.5" />
              Ask me about
            </div>

            {profile.askMeAbout.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.askMeAbout.map((topic) => (
                  <span
                    key={topic}
                    className={cn(
                      'rounded-md border bg-surface px-2.5 py-1.5 text-xs font-semibold',
                      tokens.border,
                      tokens.text,
                    )}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-3">
                {profile.isSelf
                  ? 'Add a few topics so colleagues know what to come to you for.'
                  : firstName + ' has not added any topics yet.'}
              </p>
            )}

            {profile.bio && (
              <p className="mt-4 border-t border-hairline pt-4 text-[12.5px] leading-relaxed text-ink-2">
                {profile.bio}
              </p>
            )}
          </div>

          <div className="rounded-md border border-hairline bg-surface p-4">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
              <AtriumSproutGlyph className="h-3.5 w-3.5" />
              Outside work
            </div>
            {profile.interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-md bg-surface-2 px-2 py-1 text-[11.5px] font-medium text-ink-2"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-3">Nothing shared yet.</p>
            )}
          </div>
        </div>

        {listMode && (
          <FollowListModal
            isOpen
            onClose={() => {
              setListMode(null);
              // Counts may have moved while the list was open.
              load();
            }}
            employeeId={profile.employeeId}
            mode={listMode}
            ownerName={profile.isSelf ? 'you' : firstName}
          />
        )}

        {profile.isSelf && (
          <EditProfileDrawer
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            profile={profile}
            onSaved={setProfile}
          />
        )}
      </div>

      <AtriumRail className="hidden xl:block xl:w-[264px]" />
    </div>
  );
}

export default AtriumProfilePage;
