import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, SelectField } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { aiApi } from '../api/ai.api';
import { AI_RECOMMENDATION_META, type AiProviderId, type AiScore } from '../types/ai.types';
import { cn } from '../../../utils/cn';

/**
 * HR shortlist scoring inside the candidate file: pick a provider, run the
 * score, show ring + recommendation + strengths/gaps. Advisory only — the
 * stage buttons still make the decision.
 */
export function CandidateAiScore({
  applicationId,
  score,
  onScored,
}: {
  applicationId: string;
  score: AiScore | null;
  onScored: () => void;
}) {
  const toast = useToast();
  const [provider, setProvider] = useState<AiProviderId | ''>('');
  const [isScoring, setIsScoring] = useState(false);

  const run = async () => {
    setIsScoring(true);
    try {
      await aiApi.scoreCandidate(applicationId, provider || undefined);
      toast.success('AI screening complete — review before deciding.');
      onScored();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'AI scoring failed. Check provider setup.');
    } finally {
      setIsScoring(false);
    }
  };

  const meta = score?.aiRecommendation ? AI_RECOMMENDATION_META[score.aiRecommendation] : null;
  const r = 26;
  const circ = 2 * Math.PI * r;

  return (
    <div className="rounded-md border border-violet-200/70 bg-gradient-to-br from-violet-50/60 to-indigo-50/40 p-3 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-indigo-950/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-bold">
          <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          AI Shortlist
          {score?.aiProvider && (
            <span className="font-mono text-[10px] font-medium text-ink-3">via {score.aiProvider}</span>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-32">
            <SelectField
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProviderId)}
              options={[
                { value: '', label: 'Default provider' },
                { value: 'openai', label: 'ChatGPT' },
                { value: 'opencode', label: 'Opencode' },
              ]}
            />
          </div>
          <Button size="sm" onClick={run} disabled={isScoring}>
            {isScoring ? 'Scoring…' : score ? 'Rescore' : 'Score'}
          </Button>
        </div>
      </div>

      {isScoring ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="md" variant="violet" label="Screening candidate…" />
        </div>
      ) : score?.aiScore !== undefined && score?.aiScore !== null ? (
        <div className="mt-3 flex gap-3">
          <div className="relative h-[68px] w-[68px] shrink-0">
            <svg width={68} height={68} className="-rotate-90">
              <circle cx={34} cy={34} r={r} fill="none" strokeWidth={7} className="stroke-white dark:stroke-slate-900" />
              <circle
                cx={34} cy={34} r={r} fill="none" strokeWidth={7}
                stroke={score.aiScore >= 70 ? '#10b981' : score.aiScore >= 45 ? '#f59e0b' : '#f43f5e'}
                strokeDasharray={circ}
                strokeDashoffset={circ - (Math.min(score.aiScore, 100) / 100) * circ}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[18px] font-black tabular-nums">
              {score.aiScore}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            {meta && (
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', meta.classes)}>{meta.label}</span>
            )}
            {score.aiSummary && <p className="mt-1 text-[11.5px] leading-snug text-ink-2">{score.aiSummary}</p>}
            {(score.aiStrengths?.length || score.aiGaps?.length) ? (
              <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {(score.aiStrengths?.length ?? 0) > 0 && (
                  <ul className="space-y-0.5">
                    {score.aiStrengths!.map((s, i) => (
                      <li key={i} className="text-[11px] text-emerald-700 dark:text-emerald-300">+ {s}</li>
                    ))}
                  </ul>
                )}
                {(score.aiGaps?.length ?? 0) > 0 && (
                  <ul className="space-y-0.5">
                    {score.aiGaps!.map((g, i) => (
                      <li key={i} className="text-[11px] text-rose-600 dark:text-rose-300">− {g}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            {score.aiScoredAt && (
              <p className="mt-1 text-[10px] text-ink-3">
                Scored {new Date(score.aiScoredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-ink-3">
          Not scored yet. Runs a fit screen against this job — you still shortlist manually.
        </p>
      )}
    </div>
  );
}
