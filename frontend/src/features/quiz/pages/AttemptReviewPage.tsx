import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Clock,
  FileText,
  Loader2,
  Minus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { BackButton } from '../../../components/common/BackButton';
import { Button, SegmentedTabs } from '../../../components/ui';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import {
  QUESTION_TYPE_LABELS,
  type ExplainedScore,
  type QuestionType,
} from '../types/quiz.types';

type Tab = 'questions' | 'working';

function secondsAsText(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Everything behind one score.
 *
 * Two things live here that used to be scattered or missing. Every question,
 * with the answer and the reason, available for as long as the attempt exists
 * rather than only on the screen that appeared once at submit time. And the
 * working: the points, the pass mark, the policy and the rules, so "why did I
 * get that" has an answer that does not require somebody to take HR's word for
 * it.
 */
export function AttemptReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState<ExplainedScore | null>(null);
  const [tab, setTab] = useState<Tab>('questions');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!attemptId) return;
    try {
      setIsLoading(true);
      setData(await quizApi.explainAttempt(attemptId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'That attempt is not available to you.');
      navigate('/quizzes');
    } finally {
      setIsLoading(false);
    }
    // The toast helper and navigate are stable for the life of the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-xs text-ink-3">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Opening the attempt…
      </div>
    );
  }

  if (!data) return null;

  // The concepts behind the questions that were missed, in the order they were
  // first missed. This is the same evidence the learning loop works from.
  const weakPoints = Array.from(
    new Set(data.questions.filter((q) => !q.isCorrect).flatMap((q) => q.concepts)),
  );

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={data.quizTitle || 'Attempt'}
        description={`Attempt ${data.attemptNumber} · ${new Date(data.submittedAt).toLocaleString()} · graded under ${data.gradingVersion}`}
        leading={
          <BackButton fallbackTo="/quizzes" label="Back" />
        }
        actions={
          <span
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-bold',
              data.passed
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
            )}
          >
            {data.scorePct}% · {data.passed ? 'Passed' : 'Below the pass mark'}
          </span>
        }
      />

      <StatTileRow>
        <StatTile label="Score" value={`${data.scorePct}%`} unit={`pass at ${data.passMarkPct}%`} />
        <StatTile
          label="Correct"
          value={`${data.calculation.questionsCorrect} / ${data.calculation.questionsTotal}`}
          unit={data.calculation.questionsUnanswered > 0 ? `${data.calculation.questionsUnanswered} blank` : undefined}
        />
        <StatTile
          label="Points"
          value={`${data.calculation.pointsAwarded} / ${data.calculation.pointsPossible}`}
        />
        <StatTile label="Time taken" value={secondsAsText(data.timeTakenSeconds)} />
      </StatTileRow>

      {/* Both of these change how a low score should be read, so neither is
          left for the reader to work out from the numbers. */}
      {(data.autoSubmitted || !data.snapshotAvailable) && (
        <div className="space-y-2">
          {data.autoSubmitted && (
            <p className="flex items-start gap-2 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[11.5px] text-ink-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The timer submitted this attempt. Unanswered questions scored zero and are counted in
              the total.
            </p>
          )}
          {!data.snapshotAvailable && (
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This attempt predates per-question snapshots, so the questions below are read from the
              quiz as it stands now. If the quiz has been edited since, they may not be what was
              asked.
            </p>
          )}
        </div>
      )}

      {weakPoints.length > 0 && (
        <div className="rounded-md border border-hairline bg-surface p-4">
          <h3 className="text-sm font-semibold text-ink">Your weak points in this attempt</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            The concepts behind the questions you got wrong, not the questions themselves.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {weakPoints.map((c) => (
              <span
                key={c}
                className="rounded-md border border-hairline bg-surface-2 px-2 py-1 text-[11px] font-medium text-ink-2"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <SegmentedTabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: 'questions', label: 'Questions & answers', count: data.questions.length },
          { id: 'working', label: 'How this score was calculated' },
        ]}
      />

      {tab === 'questions' && (
        <div className="space-y-3">
          {data.questions.map((q) => (
            <div key={q.index} className="rounded-md border border-hairline bg-surface p-4">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                    q.isCorrect
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : !q.answered
                        ? 'bg-surface-2 text-ink-3'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                  )}
                >
                  {q.isCorrect ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : !q.answered ? (
                    <Minus className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {q.concepts.map((c) => (
                      <span key={c} className="text-[10px] font-bold tracking-wider text-ink-3 uppercase">
                        {c}
                      </span>
                    ))}
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
                      {QUESTION_TYPE_LABELS[(q.type || 'SINGLE') as QuestionType]}
                    </span>
                    <span className="text-[10.5px] text-ink-3">
                      {q.pointsAwarded} of {q.pointsPossible} points
                    </span>
                  </div>

                  <p className="mt-0.5 text-sm font-medium text-ink">
                    {q.index + 1}. {q.prompt}
                  </p>

                  {(q.type || 'SINGLE') === 'FILL_BLANK' ? (
                    <div className="mt-2.5 space-y-1.5">
                      <p className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-ink-2">
                        <span className="font-semibold">You typed: </span>
                        {q.textAnswer ? `"${q.textAnswer}"` : 'nothing'}
                      </p>
                      <p className="rounded-md border border-emerald-300 bg-emerald-50/60 px-2.5 py-1.5 text-xs text-ink dark:border-emerald-900 dark:bg-emerald-950/20">
                        <span className="font-semibold">Accepted: </span>
                        {(q.acceptedAnswers || []).join(', ') || '—'}
                      </p>
                      <p className="text-[10.5px] text-ink-3">
                        Spelling, capitalisation and surrounding spaces were not marked.
                      </p>
                    </div>
                  ) : (
                  /* Every option, with what you picked and what was right.
                     A review that only shows the right answer leaves you to
                     remember what you chose. */
                  <div className="mt-2.5 space-y-1.5">
                    {q.options.map((option, i) => {
                      const keys =
                        q.correctOptionIndexes && q.correctOptionIndexes.length > 0
                          ? q.correctOptionIndexes
                          : [q.correctOptionIndex];
                      const mine =
                        q.selectedOptionIndexes && q.selectedOptionIndexes.length > 0
                          ? q.selectedOptionIndexes
                          : [q.selectedOptionIndex];
                      const isKey = keys.includes(i);
                      const isMine = mine.includes(i);
                      return (
                        <div
                          key={i}
                          className={cn(
                            'flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-xs',
                            isKey
                              ? 'border-emerald-300 bg-emerald-50/60 text-ink dark:border-emerald-900 dark:bg-emerald-950/20'
                              : isMine
                                ? 'border-amber-300 bg-amber-50/60 text-ink dark:border-amber-900 dark:bg-amber-950/20'
                                : 'border-hairline bg-surface text-ink-2',
                          )}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-hairline text-[10px] font-bold text-ink-3">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="min-w-0 flex-1">{option}</span>
                          {isKey && (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              {isMine ? 'Correct, and you chose it' : 'Correct answer'}
                            </span>
                          )}
                          {isMine && !isKey && (
                            <span className="shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              You chose this
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}

                  {!q.answered && (
                    <p className="mt-2 text-[11px] text-ink-3">You left this one blank.</p>
                  )}

                  {q.explanation && (
                    <p className="mt-2.5 rounded-md bg-surface-2 px-2.5 py-2 text-[11.5px] leading-relaxed text-ink-2">
                      {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'working' && (
        <div className="space-y-4">
          <div className="rounded-md border border-hairline bg-surface p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <FileText className="h-4 w-4 text-ink-3" />
              The record
            </h3>

            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {[
                ['Attempt ID', data.attemptId],
                ['Employee', data.employeeName || data.employeeId],
                ['Quiz', data.quizTitle],
                ['Submitted', new Date(data.submittedAt).toLocaleString()],
                ['Time taken', secondsAsText(data.timeTakenSeconds)],
                ['Submitted by', data.autoSubmitted ? 'The timer, at zero' : 'The employee'],
                ['Attempt number', String(data.attemptNumber)],
                ['Grading version', data.gradingVersion],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-hairline py-1.5">
                  <dt className="text-[11px] text-ink-3">{label}</dt>
                  <dd className="text-[11px] font-medium break-all text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-md border border-hairline bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink">The calculation</h3>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[11.5px]">
                <thead>
                  <tr className="border-b border-hairline text-ink-3">
                    <th className="py-1.5 pr-3 font-medium">#</th>
                    <th className="py-1.5 pr-3 font-medium">Answered</th>
                    <th className="py-1.5 pr-3 font-medium">Result</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Awarded</th>
                    <th className="py-1.5 text-right font-medium">Possible</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questions.map((q) => (
                    <tr key={q.index} className="border-b border-hairline text-ink-2">
                      <td className="py-1.5 pr-3 tabular-nums">{q.index + 1}</td>
                      <td className="py-1.5 pr-3">{q.answered ? 'Yes' : 'No'}</td>
                      <td className="py-1.5 pr-3">
                        {q.isCorrect ? 'Correct' : q.answered ? 'Incorrect' : 'Blank'}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{q.pointsAwarded}</td>
                      <td className="py-1.5 text-right tabular-nums">{q.pointsPossible}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold text-ink">
                    <td className="py-2 pr-3" colSpan={3}>
                      Total
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {data.calculation.pointsAwarded}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {data.calculation.pointsPossible}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-[11.5px] text-ink-2">
              {data.calculation.pointsAwarded} ÷ {data.calculation.pointsPossible} × 100 ={' '}
              <span className="font-bold text-ink">{data.calculation.recomputedScorePct}%</span>.
              The pass mark in force was {data.passMarkPct}%, so this attempt{' '}
              {data.passed ? 'passed' : 'did not pass'}.
            </p>

            {/* An audit needs to be told when the stored figure cannot be
                reproduced, not shielded from it. */}
            {!data.calculation.matchesStoredScore && (
              <p className="mt-2 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The stored score of {data.scorePct}% does not match the {data.calculation.recomputedScorePct}%
                that these answers produce. Raise this before relying on either figure.
              </p>
            )}
          </div>

          <div className="rounded-md border border-hairline bg-surface p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-ink-3" />
              The rules applied, version {data.gradingVersion}
            </h3>

            <ul className="mt-2.5 space-y-1.5">
              {data.gradingRules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-[11.5px] text-ink-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                  {rule}
                </li>
              ))}
            </ul>

            {'maxAttempts' in data.attemptPolicy && (
              <p className="mt-3 text-[11.5px] text-ink-2">
                <span className="font-semibold">Attempt policy at the time: </span>
                {data.attemptPolicy.maxAttempts === 0
                  ? 'unlimited attempts'
                  : `${data.attemptPolicy.maxAttempts} attempt${data.attemptPolicy.maxAttempts === 1 ? '' : 's'}`}
                {data.attemptPolicy.cooldownHours
                  ? `, ${data.attemptPolicy.cooldownHours}h between tries`
                  : ''}
                {data.attemptPolicy.scoring ? `, scored on ${String(data.attemptPolicy.scoring).toLowerCase()}` : ''}.
              </p>
            )}

            <p className="mt-3 text-[10.5px] text-ink-3">
              These rules are stored with the attempt. Changing how quizzes are graded in future
              cannot change what this score meant when it was given.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => navigate('/quizzes')}>
          Back to the arena
        </Button>
      </div>
    </div>
  );
}

export default AttemptReviewPage;
