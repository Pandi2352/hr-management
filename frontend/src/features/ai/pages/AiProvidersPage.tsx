import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bot, TerminalSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { aiApi } from '../api/ai.api';
import { ProviderStatusCard } from '../components/ProviderStatusCard';
import type { AiProvidersState } from '../types/ai.types';

export function AiProvidersPage() {
  const toast = useToast();
  const [state, setState] = useState<AiProvidersState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setState(await aiApi.providers());
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load AI providers.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="AI Providers"
        description="Screening engines for HR shortlisting. API keys stay in server env — never in the browser."
        leading={
          <Link
            to="/settings/business"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            title="Back to settings"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />

      {isLoading || !state ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : (
        <>
          {!state.enabled && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              AI features are disabled (AI_ENABLED=false). Scoring endpoints will refuse requests.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {state.providers.map((p) => (
              <ProviderStatusCard key={p.id} provider={p} />
            ))}
          </div>

          <div className="rounded-md border border-hairline bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold">
              <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              How screening plugs in
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-ink-2">
              <li>HR opens any candidate file and runs <strong>AI Shortlist</strong> — score, recommendation, strengths and gaps are stored on the application.</li>
              <li>Scores are advisory: shortlist, interview and hire decisions stay manual.</li>
              <li>Next step in the plan: auto-score every public-site application the moment it arrives.</li>
            </ul>
            <p className="mt-3 flex items-start gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <TerminalSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Backend env: AI_ENABLED · AI_DEFAULT_PROVIDER · OPENAI_API_KEY / OPENAI_MODEL · OPENCODE_BASE_URL / OPENCODE_MODEL — see .env.example</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default AiProvidersPage;
