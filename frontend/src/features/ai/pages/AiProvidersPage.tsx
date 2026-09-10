import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { aiApi } from '../api/ai.api';
import { ProviderStatusCard } from '../components/ProviderStatusCard';
import type { AiProvidersState } from '../types/ai.types';

/**
 * Where AI providers are configured.
 *
 * Monochrome apart from a connection result. The page has one job — tell an
 * administrator which engine is working and let them fix the one that is not —
 * and an earlier version buried that under coloured icons and status pills that
 * competed with each other. The cards are a single column: they now contain
 * form fields, and two columns of credential inputs side by side reads as a
 * puzzle rather than a settings page.
 */
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

  const readyCount = state?.providers.filter((p) => p.configured).length ?? 0;

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="AI Providers"
        description="Engines PeopleOS can send prompts to. Keys are encrypted on the server and never sent back to the browser."
        leading={
          <Link
            to="/settings/business"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            title="Back to settings"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        actions={
          state && (
            <span className="text-[11.5px] text-ink-3">
              {readyCount} of {state.providers.length} ready
            </span>
          )
        }
      />

      {isLoading || !state ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {!state.enabled && (
            <div className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[11.5px] text-ink-2">
              AI is switched off for this deployment, so every provider reports as unavailable.
              Set AI_ENABLED to turn it back on.
            </div>
          )}

          <div className="space-y-3">
            {state.providers.map((p) => (
              <ProviderStatusCard
                key={p.id}
                provider={p}
                canStoreKeys={state.canStoreKeys}
                onChanged={setState}
              />
            ))}
          </div>

          <div className="rounded-md border border-hairline bg-surface px-4 py-3.5">
            <h2 className="text-[12.5px] font-bold text-ink">About this page</h2>
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-ink-2">
              <li>
                A provider is an engine PeopleOS can send a prompt to. Configuring one here does not
                switch any feature on by itself.
              </li>
              <li>
                Keys are encrypted before they are stored and are never sent back to the browser.
                Use Test connection to confirm a key works before relying on it.
              </li>
              <li>
                No feature currently uses these providers. Screening and the assistant were removed
                so this module can be finished first.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default AiProvidersPage;
