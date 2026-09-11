import { useEffect, useState } from 'react';
import { Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import type { PassportSkill, SkillLevel, SkillPassport } from '../types/quiz.types';

const LEVEL_NOTE: Record<SkillLevel, string> = {
  Emerging: 'Not enough answers yet to call it',
  Developing: 'Getting there, still missing questions',
  Intermediate: 'Reliable on the common cases',
  Advanced: 'Consistently right, including the hard ones',
};

function TrendMark({ trend }: { trend: PassportSkill['trend'] }) {
  const Icon = trend === 'UP' ? TrendingUp : trend === 'DOWN' ? TrendingDown : Minus;
  return (
    <Icon
      className="h-3 w-3 text-ink-3"
      aria-label={trend === 'UP' ? 'improving' : trend === 'DOWN' ? 'slipping' : 'steady'}
    />
  );
}

/** One skill: the level, what it rests on, and which way it is moving. */
function SkillRow({ skill }: { skill: PassportSkill }) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold text-ink">{skill.skill}</h4>
            <TrendMark trend={skill.trend} />
          </div>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {skill.correct} of {skill.evidenceCount} answered correctly
            {skill.measuredByQuizzes > 1 ? `, across ${skill.measuredByQuizzes} quizzes` : ''}
          </p>
        </div>

        <span className="shrink-0 text-[11px] font-bold text-ink">{skill.level}</span>
      </div>

      {/* Four notches, because there are four levels. A continuous bar would
          imply a precision these numbers do not have. */}
      <div className="mt-2.5 flex items-center gap-1" aria-hidden="true">
        {(['Emerging', 'Developing', 'Intermediate', 'Advanced'] as SkillLevel[]).map((lvl, i) => {
          const reached =
            i <= ['Emerging', 'Developing', 'Intermediate', 'Advanced'].indexOf(skill.level);
          return (
            <span
              key={lvl}
              className={cn(
                'h-1.5 flex-1 rounded-md',
                reached ? 'bg-[var(--primary)]' : 'bg-surface-3',
              )}
            />
          );
        })}
      </div>

      <p className="mt-1.5 text-[10.5px] text-ink-3">{LEVEL_NOTE[skill.level]}</p>
    </div>
  );
}

/**
 * The Skill Passport.
 *
 * XP measures participation — it goes up for sitting a quiz badly. This is the
 * other half: what the person can actually do, drawn from the same per-concept
 * evidence the learning loop uses, so a level here is always traceable to
 * answers somebody gave.
 */
export function SkillPassportPanel({ employeeId }: { employeeId?: string }) {
  const [passport, setPassport] = useState<SkillPassport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    quizApi
      .getPassport(employeeId)
      .then((p) => {
        if (!cancelled) setPassport(p);
      })
      .catch(() => {
        if (!cancelled) setPassport(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-xs text-ink-3">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Reading your passport…
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="rounded-md border border-hairline bg-surface px-6 py-16 text-center text-xs text-ink-3">
        No passport yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* The passport itself: identity on the left, standing on the right,
          laid out like a card rather than a dashboard. */}
      <div className="rounded-md border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar src={passport.avatarUrl} name={passport.employeeName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-bold text-ink">
                  {passport.employeeName || 'You'}
                </h3>
                <span className="rounded-md border border-hairline bg-surface-2 px-2 py-0.5 text-[10.5px] font-bold text-ink-2">
                  {passport.headline}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-3">
                {[passport.jobTitle, passport.department, passport.employeeCode]
                  .filter(Boolean)
                  .join(' · ') || 'Learning profile'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { label: 'XP', value: passport.xp.toLocaleString() },
              { label: 'Level', value: passport.level },
              { label: 'Skills tracked', value: passport.skillsTracked },
              { label: 'Quizzes', value: passport.quizzesCompleted },
              { label: 'Pass rate', value: `${passport.passRate.pct}%` },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                  {m.label}
                </p>
                <p className="text-base font-bold tabular-nums text-ink">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {passport.badges.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-hairline pt-3">
            {passport.badges.map((b) => (
              <span
                key={b}
                className="rounded-md border border-hairline bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-2"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {passport.skills.length === 0 ? (
        <div className="rounded-md border border-hairline bg-surface px-6 py-14 text-center">
          <h4 className="text-sm font-semibold text-ink">No skills measured yet</h4>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-3">
            Skills appear here once you have answered questions tagged with them. Sit an assigned
            quiz and this fills itself in.
          </p>
        </div>
      ) : (
        <>
          {passport.strengths.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-ink">What you are strong at</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {passport.strengths.map((s) => (
                  <SkillRow key={s.skill} skill={s} />
                ))}
              </div>
            </div>
          )}

          {passport.growthAreas.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-ink">Where the room is</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {passport.growthAreas.map((s) => (
                  <SkillRow key={s.skill} skill={s} />
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold text-ink">
              Everything tracked ({passport.skills.length})
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {passport.skills.map((s) => (
                <SkillRow key={s.skill} skill={s} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Said plainly so nobody reads more into a level than it can carry. */}
      <p className="text-[10.5px] text-ink-3">
        Every level here rests on quiz answers only. Completed training and self-rated confidence
        are the next two kinds of evidence and will sit beside it, not replace it. A skill stays
        Emerging until at least three answers have been recorded against it.
      </p>
    </div>
  );
}
