import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import type { Quiz, TrainingRoi } from '../types/quiz.types';

/**
 * Did the training actually change what people can do?
 *
 * Completion is on this page because the other numbers are unreadable without
 * it — a 100% pass rate from two people means nothing. It is deliberately not
 * the headline, because "85% completed" answers a question about attendance
 * and this dashboard exists to answer one about capability.
 */
export function TrainingRoiPanel({ quizzes }: { quizzes: Quiz[] }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<TrainingRoi | null>(null);
  const [quizId, setQuizId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setData(await quizApi.getTrainingRoi(id || undefined));
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Could not build the report.');
        setData(null);
      } finally {
        setIsLoading(false);
      }
      // The toast helper is stable for the life of the provider.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  useEffect(() => {
    load(quizId);
  }, [load, quizId]);

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-xs text-ink-3">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Working out whether any of it helped…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md border border-hairline bg-surface px-6 py-16 text-center text-xs text-ink-3">
        No report available.
      </div>
    );
  }

  const delta = data.improvement.deltaPoints;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="cursor-pointer rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary-ring)]"
          >
            <option value="">Every quiz</option>
            {quizzes.map((q) => (
              <option key={q._id} value={q._id}>
                {q.title}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-ink-3">
            {data.totals.learners} {data.totals.learners === 1 ? 'learner' : 'learners'} ·{' '}
            {data.totals.attempts} attempts
          </span>
        </div>

        <Button size="sm" variant="outline" onClick={() => load(quizId)} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <StatTileRow>
        <StatTile
          label="Completion"
          value={`${data.completion.pct}%`}
          unit={`${data.completion.numerator} of ${data.completion.denominator}`}
        />
        <StatTile
          label="Pass rate"
          value={`${data.pass.pct}%`}
          unit={`${data.pass.numerator} of ${data.pass.denominator} attempts`}
        />
        <StatTile
          label="Gain after retry"
          value={delta > 0 ? `+${delta} pts` : `${delta} pts`}
          unit={
            data.improvement.learnersWithRetry > 0
              ? `${data.improvement.avgFirstPct}% → ${data.improvement.avgLatestPct}%`
              : 'nobody has retried'
          }
        />
        <StatTile
          label="Needing support"
          value={data.needingSupport.length}
          unit={data.needingSupport.length === 1 ? 'person' : 'people'}
        />
      </StatTileRow>

      {/* Recommendations first: the numbers above are the evidence, these are
          the thing to do about them. */}
      <div className="rounded-md border border-hairline bg-surface p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Lightbulb className="h-4 w-4 text-ink-3" />
          What to do about it
        </h3>
        <ul className="mt-2.5 space-y-2">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-ink-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
              {rec}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-hairline bg-surface p-5">
          <h3 className="text-sm font-semibold text-ink">Weakest skills</h3>
          <p className="mt-0.5 text-[11px] text-ink-3">
            Pooled across everybody. A skill needs at least three recorded answers to appear.
          </p>

          {data.weakestSkills.length === 0 ? (
            <p className="mt-3 text-xs text-ink-3">Not enough answers yet to name a weak skill.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.weakestSkills.map((s) => (
                <div key={s.skill} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-xs font-medium text-ink">
                    {s.skill}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-md bg-surface-3">
                    <span
                      className="block h-full rounded-md bg-[var(--primary)]"
                      style={{ width: `${s.masteryPct}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-ink-2">
                    {s.masteryPct}%
                  </span>
                  <span className="w-20 shrink-0 text-right text-[10.5px] text-ink-3">
                    {s.learnersAffected} {s.learnersAffected === 1 ? 'person' : 'people'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-hairline bg-surface p-5">
          <h3 className="text-sm font-semibold text-ink">Questions to review</h3>
          <p className="mt-0.5 text-[11px] text-ink-3">
            A question nearly everybody gets wrong is usually wording, not a knowledge gap.
          </p>

          {data.flaggedQuestions.length === 0 ? (
            <p className="mt-3 text-xs text-ink-3">
              Every question with enough responses is separating people properly.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {data.flaggedQuestions.map((q) => (
                <div
                  key={`${q.quizId}-${q.questionIndex}`}
                  className="rounded-md border border-hairline bg-surface-2/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                        q.flag === 'TOO_HARD'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-surface-2 text-ink-3',
                      )}
                    >
                      {q.flag === 'TOO_HARD' ? 'Almost nobody gets it' : 'Almost everybody gets it'}
                    </span>
                    <span className="text-[10.5px] text-ink-3">
                      {q.correctPct}% correct of {q.responses}
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-xs font-medium text-ink">{q.prompt}</p>
                  <p className="mt-1 text-[10.5px] text-ink-3">{q.reason}</p>
                  <p className="mt-1 text-[10.5px] text-ink-3">
                    {q.quizTitle}, question {q.questionIndex + 1}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-hairline bg-surface p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <AlertTriangle className="h-4 w-4 text-ink-3" />
          People who need a hand
        </h3>
        <p className="mt-0.5 text-[11px] text-ink-3">
          Ordered by how little they can do about it themselves.
        </p>

        {data.needingSupport.length === 0 ? (
          <p className="mt-3 text-xs text-ink-3">Nobody is stuck.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-hairline text-ink-3">
                  <th className="py-1.5 pr-3 font-medium">Person</th>
                  <th className="py-1.5 pr-3 font-medium">Quiz</th>
                  <th className="py-1.5 pr-3 font-medium">Why</th>
                  <th className="py-1.5 pr-3 font-medium">Weak on</th>
                  <th className="py-1.5 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.needingSupport.map((p) => (
                  <tr
                    key={`${p.employeeId}-${p.quizId}`}
                    className="cursor-pointer border-b border-hairline text-ink-2 transition-colors hover:bg-surface-2/50"
                    onClick={() => navigate(`/quizzes?tab=assign`)}
                  >
                    <td className="py-2 pr-3">
                      <span className="font-medium text-ink">{p.employeeName || p.employeeId}</span>
                      {p.department && (
                        <span className="block text-[10.5px] text-ink-3">{p.department}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{p.quizTitle}</td>
                    <td className="py-2 pr-3">{p.reasonLabel}</td>
                    <td className="py-2 pr-3">{p.weakConcepts.slice(0, 3).join(', ') || '—'}</td>
                    <td className="py-2 text-right tabular-nums">
                      {p.scorePct}%
                      <span className="block text-[10px] text-ink-3">
                        {p.attempts} {p.attempts === 1 ? 'try' : 'tries'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10.5px] text-ink-3">
        Built at {new Date(data.generatedAt).toLocaleString()} from{' '}
        {data.totals.assignments} assignments and {data.totals.attempts} attempts. Every figure
        carries its own numerator and denominator so it can be checked.
      </p>
    </div>
  );
}
