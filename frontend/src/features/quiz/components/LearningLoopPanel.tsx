import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lightbulb, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import {
  MASTERY_BAND_LABELS,
  type ConceptProgress,
  type LearningLoop,
  type MasteryBand,
} from '../types/quiz.types';

/**
 * The five stages, as data.
 *
 * They are a cycle, not a checklist: step five feeds step four again until the
 * concept holds. The track below draws that return path rather than ending in
 * a tick, because a person who sees a finished checklist stops.
 */
const STAGES = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'diagnosed', label: 'Weak concepts' },
  { key: 'coached', label: 'Explained' },
  { key: 'practised', label: 'Targeted retry' },
  { key: 'mastered', label: 'Mastery' },
] as const;

type StageKey = (typeof STAGES)[number]['key'];

/** Colour is a reinforcement here; the band label carries the meaning. */
const BAND_TEXT: Record<MasteryBand, string> = {
  FRAGILE: 'text-amber-700 dark:text-amber-300',
  DEVELOPING: 'text-ink-2',
  SOLID: 'text-ink-2',
  MASTERED: 'text-emerald-700 dark:text-emerald-300',
};

/**
 * A mastery arc.
 *
 * Drawn rather than a bar because these sit beside each other in a list, and a
 * row of bars reads as one long bar. The number stays inside the ring so the
 * figure and its subject cannot be separated by a line wrap.
 */
function MasteryRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, pct)) / 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={`${pct}% mastery`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--surface-3, #e5e7eb)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - filled)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-ink text-[11px] font-bold"
        style={{ fontSize: size < 40 ? 9 : 11 }}
      >
        {pct}
      </text>
    </svg>
  );
}

/**
 * The loop itself, drawn.
 *
 * Five nodes on a line with a curve that runs from the last back to the fourth,
 * so the shape on screen is the shape of the idea. Everything is one SVG: five
 * separate divs and a border trick drift apart at different zoom levels, and
 * this has to stay legible at the size it is shown.
 */
function LoopTrack({ stage }: { stage: StageKey }) {
  const activeIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 520 92" className="h-[92px] w-full min-w-[460px]" role="img" aria-label="The learning loop">
        {/* The line the stages sit on. */}
        <line x1="34" y1="30" x2="486" y2="30" stroke="var(--hairline, #e5e7eb)" strokeWidth="2" />

        {/* The return path: mastery that is not yet solid goes back to practice. */}
        <path
          d="M486 30 C 486 72, 372 72, 372 40"
          fill="none"
          stroke="var(--hairline, #e5e7eb)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <path d="M372 46 l -4 -8 l 8 0 z" fill="var(--hairline, #cbd5e1)" />

        {STAGES.map((s, i) => {
          const x = 34 + i * 113;
          const done = i < activeIndex;
          const current = i === activeIndex;

          return (
            <g key={s.key}>
              <circle
                cx={x}
                cy={30}
                r={current ? 13 : 10}
                fill={done || current ? 'var(--primary)' : 'var(--surface, #fff)'}
                stroke={done || current ? 'var(--primary)' : 'var(--hairline, #e5e7eb)'}
                strokeWidth="2"
              />
              {current && (
                <circle
                  cx={x}
                  cy={30}
                  r={18}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  opacity="0.35"
                />
              )}
              <text
                x={x}
                y={30}
                dominantBaseline="central"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={done || current ? '#fff' : 'var(--ink-3, #94a3b8)'}
              >
                {i + 1}
              </text>
              <text
                x={x}
                y={62}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight={current ? 700 : 500}
                className={current ? 'fill-ink' : 'fill-ink-3'}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        <text x="486" y="86" textAnchor="end" fontSize="9.5" className="fill-ink-3">
          repeats until it holds
        </text>
      </svg>
    </div>
  );
}

function TrendMark({ trend }: { trend: ConceptProgress['trend'] }) {
  const Icon = trend === 'UP' ? TrendingUp : trend === 'DOWN' ? TrendingDown : Minus;
  const label = trend === 'UP' ? 'improving' : trend === 'DOWN' ? 'slipping' : 'steady';
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] text-ink-3" title={`Recent answers are ${label}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

/** One weak concept, with whatever the coach had to say about it. */
function ConceptCard({ concept }: { concept: ConceptProgress }) {
  const moved = concept.masteryPct - concept.baselinePct;

  return (
    <div className="rounded-md border border-hairline bg-surface p-4">
      <div className="flex items-start gap-3">
        <MasteryRing pct={concept.masteryPct} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm font-semibold text-ink">{concept.concept}</h4>
            <span className={cn('text-[10.5px] font-bold uppercase', BAND_TEXT[concept.band])}>
              {MASTERY_BAND_LABELS[concept.band]}
            </span>
            <TrendMark trend={concept.trend} />
          </div>

          <p className="mt-0.5 text-[11px] text-ink-3">
            {concept.correct} of {concept.seen} answered correctly
            {concept.baselinePct > 0 || moved !== 0
              ? ` · started at ${concept.baselinePct}%${moved > 0 ? `, up ${moved} points` : ''}`
              : ''}
          </p>
        </div>
      </div>

      {concept.coaching && (
        <div className="mt-3 space-y-2.5 border-t border-hairline pt-3">
          {concept.coaching.whyItMatters && (
            <p className="text-[11.5px] font-medium text-ink-2">{concept.coaching.whyItMatters}</p>
          )}

          <p className="text-xs leading-relaxed text-ink-2">{concept.coaching.explanation}</p>

          {concept.coaching.commonMistake && (
            <p className="rounded-md bg-surface-2 px-2.5 py-2 text-[11.5px] text-ink-2">
              <span className="font-semibold">Where people go wrong: </span>
              {concept.coaching.commonMistake}
            </p>
          )}

          {concept.coaching.practiceTips.length > 0 && (
            <ul className="space-y-1">
              {concept.coaching.practiceTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[11.5px] text-ink-2">
                  <Target className="mt-0.5 h-3 w-3 shrink-0 text-ink-3" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Said plainly, because an explanation assembled from the quiz's own
              notes is a different thing from one written for this person. */}
          {concept.coaching.source === 'QUIZ' && (
            <p className="text-[10.5px] text-ink-3">
              Taken from this quiz's answer notes. Connect an AI provider for a fuller explanation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  quizId: string;
  loop: LearningLoop;
  onLoopChange: (loop: LearningLoop) => void;
}

/**
 * Wrong Answer → Learning Loop.
 *
 * Shown after a quiz, in place of the usual "you scored 60%, try again". A bare
 * score tells somebody they failed; this tells them which idea they are missing,
 * what it actually is, and gives them the eight questions that would settle it.
 */
export function LearningLoopPanel({ quizId, loop, onLoopChange }: Props) {
  const toast = useToast();
  const navigate = useNavigate();
  const [isCoaching, setIsCoaching] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  const weak = loop.concepts.filter((c) => c.isWeak);
  const strong = loop.concepts.filter((c) => !c.isWeak);
  const hasCoaching = weak.some((c) => c.coaching);

  const stage: StageKey = loop.practiceCount > 0
    ? weak.length === 0
      ? 'mastered'
      : 'practised'
    : hasCoaching
      ? 'coached'
      : weak.length > 0
        ? 'diagnosed'
        : 'submitted';

  const handleCoach = async () => {
    setIsCoaching(true);
    try {
      onLoopChange(await quizApi.coachLearningLoop(quizId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not put together an explanation.');
    } finally {
      setIsCoaching(false);
    }
  };

  const handlePractice = async () => {
    setIsBuilding(true);
    try {
      const set = await quizApi.buildPractice(quizId);
      navigate(`/quizzes/practice/${set.practiceId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not build a practice set.');
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="rounded-md border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Learning loop</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            {weak.length === 0
              ? 'Nothing is weak right now. This stays here and updates as you take more quizzes.'
              : `You are missing ${weak.length} ${weak.length === 1 ? 'concept' : 'concepts'}, not ${loop.concepts.length} questions. Here is what each one is.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-md border border-hairline bg-surface-2 px-3 py-2">
          <MasteryRing pct={loop.overallMasteryPct} size={38} />
          <div className="leading-tight">
            <p className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">Mastery</p>
            <p className="text-[11px] text-ink-2">
              {loop.attemptCount} {loop.attemptCount === 1 ? 'attempt' : 'attempts'}
              {loop.practiceCount > 0 && `, ${loop.practiceCount} practice`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <LoopTrack stage={stage} />
      </div>

      {weak.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3.5">
            {!hasCoaching && (
              <Button size="sm" onClick={handleCoach} disabled={isCoaching} className="gap-1.5">
                {isCoaching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5" />
                )}
                {isCoaching ? 'Working through it…' : 'Explain what I missed'}
              </Button>
            )}

            {hasCoaching && (
              <Button size="sm" onClick={handlePractice} disabled={isBuilding} className="gap-1.5">
                {isBuilding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Target className="h-3.5 w-3.5" />
                )}
                {isBuilding ? 'Building your retry…' : 'Practise just these'}
              </Button>
            )}

            {hasCoaching && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCoach}
                disabled={isCoaching}
                className="gap-1.5"
              >
                {isCoaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Explain again
              </Button>
            )}

            {/* Said up front, because a retry that quietly counted for points
                would make drilling a weakness a way to farm them. */}
            <span className="text-[10.5px] text-ink-3">
              Practice earns no XP and never touches the leaderboard.
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {weak.map((c) => (
              <ConceptCard key={c.concept} concept={c} />
            ))}
          </div>
        </>
      )}

      {strong.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-[11px] text-ink-3">
            Holding steady:{' '}
            {strong
              .map((c) => `${c.concept} (${c.masteryPct}%)`)
              .join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
