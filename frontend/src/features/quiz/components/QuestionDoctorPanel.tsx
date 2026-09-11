import { AlertTriangle, Check, Quote, Stethoscope, Wand2 } from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import type { QuestionDiagnosis } from '../types/quiz.types';

interface Props {
  diagnosis: QuestionDiagnosis;
  /** Applies the suggested wording to the question. */
  onApplyRewrite: (rewrite: string) => void;
  /** Replaces the wrong options with the suggested ones. */
  onApplyDistractors: (distractors: string[]) => void;
  /** Fills the explanation from the diagnosis. */
  onApplyExplanation: (explanation: string) => void;
}

/**
 * What the Question Doctor found.
 *
 * Every finding is actionable or it is not shown. A review panel that reports
 * "clarity: 62" and stops has told the reviewer nothing they can do, so each
 * suggestion here carries the button that applies it.
 *
 * The clarity score is the only number, and it is banded rather than precise:
 * the difference between 61 and 64 is noise, the difference between 40 and 80
 * is the whole point.
 */
export function QuestionDoctorPanel({
  diagnosis,
  onApplyRewrite,
  onApplyDistractors,
  onApplyExplanation,
}: Props) {
  const score = diagnosis.clarityScore;
  const band =
    score >= 75
      ? { label: 'Clear', classes: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' }
      : score >= 50
        ? { label: 'Needs work', classes: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' }
        : { label: 'Rewrite it', classes: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300' };

  return (
    <div className="space-y-3 rounded-md border border-hairline bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
          <Stethoscope className="h-3.5 w-3.5" />
          Question doctor
        </span>

        <span className={cn('rounded-md px-1.5 py-0.5 text-[10.5px] font-bold', band.classes)}>
          {band.label} · {score}/100
        </span>

        <span className="rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-[10.5px] font-medium text-ink-2">
          Reads as {diagnosis.estimatedDifficulty.toLowerCase()}
        </span>
      </div>

      {/* Ambiguity first: a question with two defensible answers is broken
          regardless of how well it reads. */}
      {diagnosis.ambiguityWarning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{diagnosis.ambiguityWarning}</span>
        </div>
      )}

      {diagnosis.issues.length > 0 && (
        <ul className="space-y-1">
          {diagnosis.issues.map((issue) => (
            <li key={issue} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
              {issue}
            </li>
          ))}
        </ul>
      )}

      {diagnosis.suggestedRewrite && (
        <Suggestion
          title="Clearer wording"
          body={diagnosis.suggestedRewrite}
          actionLabel="Use this wording"
          onApply={() => onApplyRewrite(diagnosis.suggestedRewrite)}
        />
      )}

      {diagnosis.betterDistractors.length > 0 && (
        <Suggestion
          title="Stronger wrong answers"
          body={diagnosis.betterDistractors.map((d) => `• ${d}`).join('\n')}
          actionLabel="Replace the distractors"
          onApply={() => onApplyDistractors(diagnosis.betterDistractors)}
        />
      )}

      {diagnosis.answerKeyExplanation && (
        <Suggestion
          title="Why the marked answer is right"
          body={diagnosis.answerKeyExplanation}
          actionLabel="Use as the explanation"
          onApply={() => onApplyExplanation(diagnosis.answerKeyExplanation)}
        />
      )}

      {/* Evidence appears only when generation was grounded in a document, which
          is what makes a disputed answer checkable rather than arguable. */}
      {diagnosis.sourceEvidence && (
        <div className="rounded-md border border-hairline bg-surface p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
            <Quote className="h-3 w-3" />
            Source evidence
          </div>
          <p className="text-[11.5px] italic leading-relaxed text-ink-2">
            “{diagnosis.sourceEvidence}”
          </p>
        </div>
      )}

      {diagnosis.issues.length === 0 &&
        !diagnosis.ambiguityWarning &&
        !diagnosis.suggestedRewrite && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-emerald-700 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            Nothing to fix. This one is ready.
          </p>
        )}
    </div>
  );
}

function Suggestion({
  title,
  body,
  actionLabel,
  onApply,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onApply: () => void;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          <Wand2 className="h-3 w-3" />
          {title}
        </span>
        <Button size="sm" variant="outline" onClick={onApply} className="text-[11px]">
          {actionLabel}
        </Button>
      </div>
      <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}
