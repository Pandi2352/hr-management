import { useNavigate } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import { AtriumOrbitGlyph, AtriumSparkGlyph } from '../icons/AtriumIcons';
import { MoodBadge, Monogram } from './Monogram';
import { FollowButton } from './FollowButton';
import type { AtriumProfile } from '../types/atrium.types';

interface ColleagueCardProps {
  profile: AtriumProfile;
  onChange: (employeeId: string, patch: Partial<AtriumProfile>) => void;
}

/**
 * One colleague in the mosaic.
 *
 * Colour here is the product's own theme, never the person's accent. Earlier
 * versions filled the banner, then a top rule and the role line, with each
 * colleague's own hue, and a page of thirty-five turned into a patchwork that
 * competed with the photographs. One colour, driven by the customizer, does the
 * same wayfinding work without the noise.
 *
 * The portrait is the largest element, and it steps up over the cover's edge
 * rather than sitting below it. The ring around it is the card's own background
 * colour, which reads as a cut-out and is what keeps the photo unmistakably in
 * front of the cover instead of buried under it.
 *
 * "Ask me about" is the hero content rather than the bio. In a workplace
 * directory, what someone can be approached about is the thing worth surfacing.
 */
export function ColleagueCard({ profile, onChange }: ColleagueCardProps) {
  const navigate = useNavigate();
  const open = () => navigate(`/atrium/${profile.employeeId}`);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-hairline bg-surface transition-colors hover:border-ink-3/40">
      {/* The cover, at a size worth looking at. Always rendered, empty or not,
          so every card in the grid keeps the same rhythm. */}
      <button
        type="button"
        onClick={open}
        aria-label={`Open ${profile.displayName}'s profile`}
        tabIndex={-1}
        className="relative h-[74px] w-full shrink-0 cursor-pointer overflow-hidden bg-surface-2"
      >
        {profile.coverUrl ? (
          <img
            src={profile.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-4 w-4 text-ink-3/30" />
          </span>
        )}

        {profile.isSelf && (
          <span className="absolute right-2 top-2 rounded-md bg-surface px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-2">
            You
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5">
        {/*
          The portrait steps up out of the card and over the cover's edge.
          Everything below it starts at the card's own left margin, so the photo
          breaks the grid line rather than sitting in it — the one deliberately
          irregular thing on an otherwise strict card.

          The ring is the card's background colour, not a border: it reads as a
          cut-out, which is what keeps the portrait unmistakably in front of the
          cover instead of buried under it.
        */}
        <div className="-mt-8 flex items-end justify-between gap-3">
          <button
            type="button"
            onClick={open}
            aria-label={`Open ${profile.displayName}'s profile`}
            className="relative z-10 shrink-0 cursor-pointer overflow-hidden rounded-md ring-[3px] ring-surface transition-opacity hover:opacity-90"
          >
            <Monogram
              profile={profile}
              className="h-[68px] w-[68px] rounded-md"
              textClassName="text-xl"
            />
          </button>

          <FollowButton
            profile={profile}
            size="sm"
            onChange={(patch) => onChange(profile.employeeId, patch)}
            className="mb-0.5 shrink-0"
          />
        </div>

        <div className="mt-2.5 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={open}
              className="block w-full cursor-pointer truncate text-left text-[13.5px] font-bold leading-tight text-ink hover:underline"
            >
              {profile.displayName}
            </button>
            <p className="mt-0.5 truncate text-[11.5px] font-semibold text-primary">
              {profile.designationTitle || 'Team member'}
            </p>
            <p className="truncate text-[11px] text-ink-3">
              {profile.departmentName || 'Unassigned'}
              {profile.pronouns && <span> · {profile.pronouns}</span>}
            </p>

            {profile.followerCount > 0 && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-ink-3">
                <AtriumOrbitGlyph className="h-3 w-3" />
                {profile.followerCount}
                {profile.followerCount === 1 ? ' follower' : ' followers'}
              </span>
            )}
          </div>
        </div>

        {profile.mood && <MoodBadge profile={profile} className="mt-2.5" />}

        {profile.bio && (
          <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-2">
            {profile.bio}
          </p>
        )}

        {profile.askMeAbout.length > 0 && (
          <div className="mt-auto pt-3">
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3">
              <AtriumSparkGlyph className="h-3 w-3" />
              Ask me about
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.askMeAbout.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  className="rounded-md bg-primary-light px-1.5 py-0.5 text-[10.5px] font-medium text-primary"
                >
                  {topic}
                </span>
              ))}
              {profile.askMeAbout.length > 3 && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-3">
                  +{profile.askMeAbout.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
