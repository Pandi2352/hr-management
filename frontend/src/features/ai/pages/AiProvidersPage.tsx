import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { useTheme } from '../../../hooks/useTheme';
import { aiApi } from '../api/ai.api';
import { ProviderStatusCard } from '../components/ProviderStatusCard';
import type { AiProviderId, AiProvidersState } from '../types/ai.types';
import aiProviderLightBg from '../../../assets/ai_provider_light_banner.jpg';
import aiProviderDarkBg from '../../../assets/ai_provider_dark_banner.jpg';
import { ProviderIcon } from '../components/ProviderIcon';
import { cn } from '../../../utils/cn';

export function AiProvidersPage() {
  const toast = useToast();
  const { theme } = useTheme();
  const [state, setState] = useState<AiProvidersState | null>(null);
  const [activeTab, setActiveTab] = useState<AiProviderId>('openai');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await aiApi.providers();
      setState(data);
      // Auto-select the default or first configured provider on load
      const defaultProv = data.providers.find((p) => p.isDefault);
      const configuredProv = data.providers.find((p) => p.configured);
      if (defaultProv) {
        setActiveTab(defaultProv.id);
      } else if (configuredProv) {
        setActiveTab(configuredProv.id);
      } else if (data.providers.length > 0) {
        setActiveTab(data.providers[0].id);
      }
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

  const activeProvider = state?.providers.find((p) => p.id === activeTab) || state?.providers[0];
  const readyCount = state?.providers.filter((p) => p.configured).length ?? 0;
  const defaultProvider = state?.providers.find((p) => p.isDefault);
  const bgImage = theme === 'dark' ? aiProviderDarkBg : aiProviderLightBg;

  return (
    <div className="w-full space-y-4">
      {/* Standard Header Navigation */}
      <PageHeader
        title="AI Providers"
        description="Configure API credentials and select the active AI engine for system operations."
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
            <div className="flex items-center gap-2">
              {defaultProvider && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Active Engine: {defaultProvider.displayName}</span>
                </span>
              )}
              <span className="rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-ink-2">
                {readyCount} of {state.providers.length} ready
              </span>
            </div>
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
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-200">
              AI module is currently disabled at the server level (`AI_ENABLED=false`). Set `AI_ENABLED=true` to enable live model execution.
            </div>
          )}

          {/* Provider Tabs with Unique Generative AI Background Effect - strictly rounded-md, NO shadows */}
          <div
            className="relative rounded-md border border-hairline p-1 bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(${bgImage})` }}
          >
            {/* Semi-translucent glass overlay track */}
            <div
              role="tablist"
              className="flex items-center gap-1.5 overflow-x-auto rounded-md bg-surface/90 backdrop-blur-md p-1.5"
            >
              {state.providers.map((p) => {
                const isActive = activeTab === p.id;
                return (
                  <button
                    key={p.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActiveTab(p.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-surface text-ink font-semibold border border-hairline'
                        : 'text-ink-3 hover:text-ink hover:bg-surface/60',
                    )}
                  >
                    <ProviderIcon providerId={p.id} className="h-4 w-4" />
                    <span>{p.displayName}</span>

                    {/* Active Status: Only ONE active provider has the green light at a time */}
                    {p.isDefault ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Provider Card */}
          {activeProvider && (
            <ProviderStatusCard
              key={activeProvider.id}
              provider={activeProvider}
              canStoreKeys={state.canStoreKeys}
              onChanged={setState}
            />
          )}
        </>
      )}
    </div>
  );
}

export default AiProvidersPage;
