import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { aiApi } from '../api/ai.api';
import type { AiProviderStatus, AiProvidersState } from '../types/ai.types';

interface Props {
  provider: AiProviderStatus;
  /** False when the server has no encryption secret, so keys cannot be stored. */
  canStoreKeys: boolean;
  onChanged: (state: AiProvidersState) => void;
}

/**
 * One provider: its status, its settings, and a live connection test.
 *
 * Monochrome by design. An earlier version gave each provider a coloured icon
 * and a coloured status pill, which put the loudest thing on the page on
 * decoration rather than on the one fact that matters — whether the provider
 * works. Here the only colour is the connection result, because that is the
 * answer the page exists to give.
 *
 * The key field is write-only. What comes back from the server is a masked
 * form; the plaintext never leaves the server once saved, so the input starts
 * empty and an empty save leaves the stored key alone.
 */
export function ProviderStatusCard({ provider, canStoreKeys, onChanged }: Props) {
  const toast = useToast();

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(provider.model);
  const [host, setHost] = useState(provider.host);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; latencyMs: number; detail: string } | null>(null);

  // Re-seed when the server sends new state, so a save is reflected here.
  useEffect(() => {
    setModel(provider.model);
    setHost(provider.host);
  }, [provider.model, provider.host]);

  const dirty =
    apiKey.trim().length > 0 || model !== provider.model || host !== provider.host;

  const runTest = async () => {
    setIsTesting(true);
    setResult(null);
    try {
      setResult(await aiApi.testProvider(provider.id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResult({ ok: false, latencyMs: 0, detail: msg || 'Test could not run.' });
    } finally {
      setIsTesting(false);
    }
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const next = await aiApi.saveProviderSettings(provider.id, {
        // Omitted when blank, so saving a model change keeps the stored key.
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        model,
        host,
      });
      onChanged(next);
      setApiKey('');
      setResult(null);
      toast.success(`${provider.displayName} settings saved.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save these settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearKey = async () => {
    setIsSaving(true);
    try {
      // An empty string is the clear signal; omitting it would keep the key.
      const next = await aiApi.saveProviderSettings(provider.id, { apiKey: '' });
      onChanged(next);
      setApiKey('');
      setResult(null);
      toast.success('Stored key removed.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not remove the key.');
    } finally {
      setIsSaving(false);
    }
  };

  const modelOptions = provider.models.map((m) => ({
    value: m.id,
    label: `${m.label} — ${m.note}`,
  }));

  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13.5px] font-bold text-ink">{provider.displayName}</h3>

            {provider.isDefault && (
              <span className="rounded-md border border-hairline px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-3">
                Default
              </span>
            )}

            {/* The one status that matters, said in words rather than a colour */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                provider.configured ? 'bg-surface-2 text-ink-2' : 'bg-surface-2 text-ink-3',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  provider.configured ? 'bg-emerald-500' : 'bg-ink-3/40',
                )}
              />
              {provider.configured ? 'Ready' : 'Not configured'}
            </span>
          </div>

          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{provider.hint}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={runTest} disabled={isTesting}>
            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isTesting ? 'Testing' : 'Test connection'}
          </Button>
        </div>
      </header>

      {result && (
        <div
          className={cn(
            'flex items-start gap-2 border-b border-hairline px-4 py-2.5 text-[11.5px]',
            result.ok
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
          )}
        >
          {result.ok ? (
            <Check className="mt-px h-3.5 w-3.5 shrink-0" />
          ) : (
            <X className="mt-px h-3.5 w-3.5 shrink-0" />
          )}
          <span className="min-w-0">
            {result.detail}
            {result.latencyMs > 0 && <span className="opacity-70"> · {result.latencyMs}ms</span>}
          </span>
        </div>
      )}

      <div className="space-y-3.5 px-4 py-3.5">
        {provider.supportsUiConfig ? (
          <>
            {!canStoreKeys && (
              <p className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-[11px] text-ink-2">
                This server has no credential secret configured, so keys cannot be saved here. Set
                CREDENTIALS_SECRET and restart, or configure the provider through the environment.
              </p>
            )}

            <div>
              <label className="mb-1 block text-[11.5px] font-semibold text-ink">API key</label>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider.hasApiKey ? provider.apiKeyMasked || '••••••••' : 'Paste your key'}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={!canStoreKeys}
                    className="pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-ink-3 transition-colors hover:text-ink"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {provider.hasApiKey && provider.source === 'database' && (
                  <Button variant="outline" size="sm" onClick={clearKey} disabled={isSaving}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[10.5px] text-ink-3">
                {provider.hasApiKey
                  ? `A key is stored (${provider.apiKeyMasked}). Leave this blank to keep it.`
                  : 'Stored encrypted. It is never sent back to the browser.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-ink">Model</label>
                {modelOptions.length > 0 ? (
                  <SelectField
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    options={modelOptions}
                  />
                ) : (
                  <Input value={model} onChange={(e) => setModel(e.target.value)} />
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-ink">Host</label>
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="https://ollama.com"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
              <span className="text-[10.5px] text-ink-3">
                {provider.source === 'database'
                  ? 'Configured on this page.'
                  : 'Using environment defaults.'}
              </span>
              <Button size="sm" onClick={save} disabled={!dirty || isSaving || !canStoreKeys}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {isSaving ? 'Saving' : 'Save'}
              </Button>
            </div>
          </>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[11.5px] sm:grid-cols-2">
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-ink-3">Model</dt>
              <dd className="truncate font-mono text-[11px] text-ink-2">{provider.model}</dd>
            </div>
            <div className="flex justify-between gap-3 sm:block">
              <dt className="text-ink-3">Configured by</dt>
              <dd className="text-ink-2">Server environment</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
