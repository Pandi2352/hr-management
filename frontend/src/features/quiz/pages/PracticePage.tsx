import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Target, X } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { BackButton } from '../../../components/common/BackButton';
import { Button } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import {
  MASTERY_BAND_LABELS,
  type PracticeResult,
  type PracticeSetView,
} from '../types/quiz.types';

/** Where a practice question came from, said plainly when it is worth saying. */
const ORIGIN_NOTE: Record<PracticeSetView['questions'][number]['origin'], string> = {
  QUIZ: 'From the quiz',
  BANK: 'From the question bank',
  AI: 'Written for you',
};

/**
 * The targeted retry.
 *
 * Every question on one page rather than one at a time, and no clock. A retry
 * that looks like the exam it follows feels like a punishment, and the point
 * here is to close a gap, not to measure one again.
 */
export function PracticePage() {
  const { practiceId } = useParams<{ practiceId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [set, setSet] = useState<PracticeSetView | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!practiceId) return;
    try {
      setIsLoading(true);
      setSet(await quizApi.getPractice(practiceId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'That practice set is not available.');
      navigate('/quizzes');
    } finally {
      setIsLoading(false);
    }
    // The toast helper and navigate are stable for the life of the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!set) return;

    const unanswered = set.questions.filter((q) => answers[q.index] === undefined).length;
    if (unanswered === set.questions.length) {
      toast.warning('Answer at least one question first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = set.questions.map((q) => ({
        questionIndex: q.index,
        // Unanswered goes in as -1 and scores nothing, rather than blocking a
        // submission somebody has decided they are done with.
        selectedOptionIndex: answers[q.index] ?? -1,
      }));
      setResult(await quizApi.submitPractice(set.practiceId, payload));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not record that practice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-xs text-ink-3">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading your practice set…
      </div>
    );
  }

  if (!set) return null;

  // --- Results --------------------------------------------------------------

  if (result) {
    return (
      <div className="w-full space-y-5">
        <PageHeader
          title="Practice recorded"
          description={`${result.correctCount} of ${result.total} correct. No XP, no leaderboard — this only moves your mastery.`}
          leading={
              <BackButton fallbackTo="/quizzes" label="Back" />
          }
        />

        {/* What actually moved. The reason a person came back. */}
        <div className="rounded-md border border-hairline bg-surface p-5">
          <h3 className="text-sm font-semibold text-ink">Where your mastery went</h3>

          <div className="mt-3 space-y-2">
            {result.movement.map((m) => {
              const delta = m.afterPct - m.beforePct;
              return (
                <div
                  key={m.concept}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-surface-2/40 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{m.concept}</p>
                    <p className="text-[11px] text-ink-3">
                      {m.resolved
                        ? 'No longer counted as a weak spot.'
                        : 'Still counted as weak — one more round should settle it.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="tabular-nums text-ink-3">{m.beforePct}%</span>
                    <span className="text-ink-3">→</span>
                    <span className="font-bold tabular-nums text-ink">{m.afterPct}%</span>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10.5px] font-bold',
                        delta > 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-surface-2 text-ink-3',
                      )}
                    >
                      {delta > 0 ? `+${delta}` : delta} · {MASTERY_BAND_LABELS[m.band]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {result.remainingWeakConcepts.length > 0 ? (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const next = await quizApi.buildPractice(result.loop.quizId);
                    navigate(`/quizzes/practice/${next.practiceId}`);
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || 'Could not build another round.');
                  }
                }}
                className="gap-1.5"
              >
                <Target className="h-3.5 w-3.5" />
                Another round on {result.remainingWeakConcepts[0]}
              </Button>
            ) : (
              <p className="text-xs text-ink-2">
                Every concept from that quiz is holding. Nothing left to drill.
              </p>
            )}

            <Button size="sm" variant="outline" onClick={() => navigate('/quizzes')}>
              Back to the arena
            </Button>
          </div>
        </div>

        {/* The answers, with the reason attached to each. */}
        <div className="space-y-3">
          {result.answers.map((a) => (
            <div key={a.questionIndex} className="rounded-md border border-hairline bg-surface p-4">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                    a.isCorrect
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                  )}
                >
                  {a.isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-ink-3 uppercase">
                    {a.concept}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{a.prompt}</p>

                  <p className="mt-2 text-xs text-ink-2">
                    <span className="font-semibold">Correct: </span>
                    {a.options[a.correctOptionIndex]}
                  </p>
                  {!a.isCorrect && a.selectedOptionIndex >= 0 && (
                    <p className="mt-0.5 text-xs text-ink-3">
                      You chose: {a.options[a.selectedOptionIndex]}
                    </p>
                  )}
                  {!a.isCorrect && a.selectedOptionIndex < 0 && (
                    <p className="mt-0.5 text-xs text-ink-3">You left this one blank.</p>
                  )}

                  {a.explanation && (
                    <p className="mt-2 rounded-md bg-surface-2 px-2.5 py-2 text-[11.5px] leading-relaxed text-ink-2">
                      {a.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Taking it ------------------------------------------------------------

  const answeredCount = set.questions.filter((q) => answers[q.index] !== undefined).length;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Targeted retry"
        description={`Only ${set.concepts.join(', ')}. No timer, no XP — this is the short way back.`}
        leading={
          <BackButton fallbackTo="/quizzes" label="Back" />
        }
        actions={
          <span className="text-xs text-ink-3">
            {answeredCount} of {set.questions.length} answered
          </span>
        }
      />

      <div className="space-y-3">
        {set.questions.map((q, i) => (
          <div key={q.index} className="rounded-md border border-hairline bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-ink-3 uppercase">
                {q.concept}
              </span>
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                {ORIGIN_NOTE[q.origin]}
              </span>
            </div>

            <p className="mt-2 text-sm font-medium text-ink">
              {i + 1}. {q.prompt}
            </p>

            <div className="mt-3 space-y-2">
              {q.options.map((option, optIdx) => {
                const isSelected = answers[q.index] === optIdx;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.index]: optIdx }))}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 rounded-md border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                        : 'border-hairline bg-surface hover:bg-surface-2',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
                        isSelected
                          ? 'bg-[var(--primary)] text-white'
                          : 'border border-hairline text-ink-3',
                      )}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-xs text-ink">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-surface px-4 py-3">
        <span className="text-[11px] text-ink-3">
          Unanswered questions score nothing and do not count against you twice.
        </span>

        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {isSubmitting ? 'Recording…' : 'Check my answers'}
        </Button>
      </div>
    </div>
  );
}

export default PracticePage;
