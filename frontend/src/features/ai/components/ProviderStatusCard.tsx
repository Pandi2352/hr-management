import { useState } from 'react';
import { Bot, FlaskConical, KeyRound, Server } from 'lucide-react';
import { Button } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { cn } from '../../../utils/cn';
import { aiApi } from '../api/ai.api';
import type { AiProviderStatus } from '../types/ai.types';

const ICONS = {
  openai: KeyRound,
  opencode: Server,
} as const;

/**
 * One provider card: status, model, default badge, enable hint — plus a live
 * Test button whose pass/fail renders inline (latency + detail).
 * Keys stay server-side; only the verdict travels.
 */
export function ProviderStatusCard({ provider }: { provider: AiProviderStatus }) {
  const Icon = ICONS[provider.id] ?? Bot;
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; latencyMs: number; detail: string } | null>(null);

  const runTest = async () => {
    setIsTesting(true);
    setResult(null);
    try {
      setResult(await aiApi.testProvider(provider.id));
    } catch {
      setResult({ ok: false, latencyMs: 0, detail: 'Test request failed. Is the backend running?' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="rounded-md border border-hairline bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-bold">
              {provider.displayName}
              {provider.isDefault && (
                <span className="rounded bg-violet-50 px-1.5 py-px text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  DEFAULT
                </span>
              )}
            </p>
            <p className="font-mono text-[11px] text-ink-3">{provider.model}</p>
          </div>
        </div>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
            provider.configured
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', provider.configured ? 'bg-emerald-500' : 'bg-slate-400')} />
          {provider.configured ? 'Ready' : 'Not configured'}
        </span>
      </div>

      {!provider.configured && (
        <p className="mt-3 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {provider.hint}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
        <Button size="sm" variant="outline" onClick={runTest} disabled={isTesting} className="flex items-center gap-1.5">
          {isTesting ? <Spinner size="xs" variant="muted" /> : <FlaskConical className="h-3.5 w-3.5" />}
          {isTesting ? 'Testing…' : result ? 'Retest' : 'Test'}
        </Button>
        {result && !isTesting && (
          <p className={cn('min-w-0 flex-1 truncate text-[11px] font-medium', result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')} title={result.detail}>
            {result.ok ? '✓' : '✗'} {result.detail}
            {result.latencyMs > 0 && <span className="ml-1 text-ink-3">({result.latencyMs}ms)</span>}
          </p>
        )}
      </div>
    </div>
  );
}
