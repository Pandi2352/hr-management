import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Send,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/toast';
import { useTheme } from '../../../hooks/useTheme';
import { cn } from '../../../utils/cn';
import { aiApi } from '../api/ai.api';
import { ProviderIcon } from './ProviderIcon';
import type { AiProviderId, AiProviderStatus, AiProvidersState } from '../types/ai.types';
import aiProviderLightBg from '../../../assets/ai_provider_light_banner.jpg';
import aiProviderDarkBg from '../../../assets/ai_provider_dark_banner.jpg';

interface Props {
  provider: AiProviderStatus;
  canStoreKeys: boolean;
  onChanged: (state: AiProvidersState) => void;
}

const PROVIDER_INFO: Record<
  AiProviderId,
  {
    docsUrl: string;
    docsLabel: string;
    defaultHost: string;
    samplePrompt: string;
  }
> = {
  openai: {
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'platform.openai.com',
    defaultHost: 'https://api.openai.com/v1',
    samplePrompt: 'Hello OpenAI! Confirm that API credentials are functioning properly.',
  },
  anthropic: {
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'console.anthropic.com',
    defaultHost: 'https://api.anthropic.com/v1',
    samplePrompt: 'Hello Claude! Confirm that API credentials are functioning properly.',
  },
  gemini: {
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'aistudio.google.com',
    defaultHost: 'https://generativelanguage.googleapis.com/v1beta/openai',
    samplePrompt: 'Hello Gemini! Confirm that API credentials are functioning properly.',
  },
  groq: {
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'console.groq.com',
    defaultHost: 'https://api.groq.com/openai/v1',
    samplePrompt: 'Hello Groq! Confirm that API credentials are functioning properly.',
  },
  ollama: {
    docsUrl: 'https://ollama.com',
    docsLabel: 'ollama.com',
    defaultHost: 'http://localhost:11434',
    samplePrompt: 'Hello Ollama! Confirm that local or cloud model is ready.',
  },
  opencode: {
    docsUrl: 'http://localhost:4096',
    docsLabel: 'localhost:4096',
    defaultHost: 'http://localhost:4096',
    samplePrompt: 'Hello OpenCode! Confirm that local server is ready.',
  },
};

export function ProviderStatusCard({ provider, canStoreKeys, onChanged }: Props) {
  const toast = useToast();
  const { theme } = useTheme();
  const bgImage = theme === 'dark' ? aiProviderDarkBg : aiProviderLightBg;

  const info = PROVIDER_INFO[provider.id] || {
    docsUrl: '',
    docsLabel: '',
    defaultHost: '',
    samplePrompt: 'Hello! Confirm that API credentials are functioning.',
  };

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(provider.model);
  const [host, setHost] = useState(provider.host);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs: number; detail: string } | null>(null);

  // Playground state
  const [playgroundPrompt, setPlaygroundPrompt] = useState(info.samplePrompt);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<{
    reply: string;
    latencyMs: number;
    modelUsed: string;
  } | null>(null);

  // Re-seed when provider props change
  useEffect(() => {
    if (provider.models.length > 0 && !provider.models.some((m) => m.id === provider.model)) {
      setModel(provider.models[0].id);
    } else {
      setModel(provider.model);
    }
    setHost(provider.host);
    setPlaygroundPrompt(info.samplePrompt);
    setTestResult(null);
    setPlaygroundResponse(null);
  }, [provider.id, provider.model, provider.host, provider.models, info.samplePrompt]);

  const dirty = apiKey.trim().length > 0 || model !== provider.model || host !== provider.host;

  const runTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await aiApi.testProvider(provider.id);
      setTestResult(res);
      if (res.ok) {
        toast.success(`Connected to ${provider.displayName} (${res.latencyMs}ms)`);
      } else {
        toast.error(`${provider.displayName}: ${res.detail}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTestResult({ ok: false, latencyMs: 0, detail: msg || 'Connection test could not run.' });
      toast.error(msg || 'Connection test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSetDefault = async () => {
    setIsSettingDefault(true);
    try {
      const next = await aiApi.setDefaultProvider(provider.id);
      onChanged(next);
      toast.success(`${provider.displayName} is now active for all system AI operations.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not set default provider.');
    } finally {
      setIsSettingDefault(false);
    }
  };

  const save = async (makeDefault?: boolean) => {
    setIsSaving(true);
    try {
      const next = await aiApi.saveProviderSettings(provider.id, {
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        model: model.trim(),
        host: host.trim(),
        ...(makeDefault ? { isDefault: true } : {}),
      });
      onChanged(next);
      setApiKey('');
      setTestResult(null);
      toast.success(
        makeDefault
          ? `${provider.displayName} saved and set as active engine!`
          : `${provider.displayName} configuration saved.`,
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save provider settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearKey = async () => {
    setIsSaving(true);
    try {
      const next = await aiApi.saveProviderSettings(provider.id, { apiKey: '' });
      onChanged(next);
      setApiKey('');
      setTestResult(null);
      toast.success(`Stored key removed for ${provider.displayName}.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not remove key.');
    } finally {
      setIsSaving(false);
    }
  };

  const executePlaygroundPrompt = async () => {
    if (!playgroundPrompt.trim()) return;
    setPlaygroundLoading(true);
    setPlaygroundResponse(null);
    try {
      const res = await aiApi.testPrompt(provider.id, playgroundPrompt.trim());
      setPlaygroundResponse(res);
      toast.success(`Generated in ${res.latencyMs}ms`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Prompt generation failed. Check API key.');
    } finally {
      setPlaygroundLoading(false);
    }
  };

  const modelOptions = provider.models.map((m) => ({
    value: m.id,
    label: `${m.label} — ${m.note}`,
  }));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4">
      {/* Main Configuration Card - NO shadows, rounded-md everywhere, NO overflow-hidden so dropdowns float freely */}
      <div className="rounded-md border border-hairline bg-surface relative z-10">
        {/* Generative AI Background Header Banner with Unique Provider Logo Showcase */}
        <div
          className="relative bg-cover bg-center border-b border-hairline overflow-hidden rounded-t-md"
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          {/* Frosted glass backdrop with gradient to highlight the provider logo and showcase the AI artwork */}
          <div className="bg-gradient-to-r from-surface/95 via-surface/85 to-surface/65 backdrop-blur-md p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Unique Provider Logo Showcase Emblem */}
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface/90 backdrop-blur-md p-2.5 transition-transform">
                <ProviderIcon providerId={provider.id} className="h-11 w-11" />
                {provider.isDefault && (
                  <span
                    className="absolute -top-1 -right-1 flex h-3.5 w-3.5"
                    title="Active Engine for All AI Works"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-surface" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold text-ink tracking-tight">{provider.displayName}</h2>
                  {provider.isDefault ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active Engine for All AI Works
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface/80 border border-hairline px-2 py-0.5 text-[11px] font-medium text-ink-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-3/40" />
                      {provider.configured ? 'Configured (Standby)' : 'Not Configured'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-2 mt-1 leading-relaxed">{provider.hint}</p>

                {/* Architecture & Model Meta Tags */}
                <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface/80 border border-hairline px-2 py-0.5 font-mono text-ink-2">
                    <span className="text-ink-3">Model:</span>
                    <strong className="font-semibold text-ink">{provider.model}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface/80 border border-hairline px-2 py-0.5 text-ink-3">
                    {provider.id === 'ollama' || provider.id === 'opencode'
                      ? 'Local / Self-Hosted Inference'
                      : 'Cloud Managed API'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface/80 border border-hairline px-2 py-0.5 text-ink-3 font-mono text-[10px]">
                    AES-256-GCM
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons on Frosted Glass */}
            <div className="flex items-center gap-2">
              {!provider.isDefault && provider.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetDefault}
                  disabled={isSettingDefault}
                  className="gap-1.5 rounded-md text-xs bg-surface/90 hover:bg-surface border-hairline"
                >
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                  <span>{isSettingDefault ? 'Activating...' : 'Make Active'}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={runTest}
                disabled={isTesting}
                className="gap-1.5 rounded-md text-xs bg-surface/90 hover:bg-surface border-hairline"
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Card Body with Form Fields - clean surface, no background bleed */}
        <div className="p-4 space-y-3.5 bg-surface">

        {/* Test Result Bar (if tested) */}
        {testResult && (
          <div
            className={cn(
              'flex items-center justify-between rounded-md border px-3 py-2 text-xs',
              testResult.ok
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-800 dark:text-rose-200 border-rose-500/20',
            )}
          >
            <div className="flex items-center gap-2">
              {testResult.ok ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span className="font-medium">{testResult.detail}</span>
            </div>
            {testResult.latencyMs > 0 && (
              <span className="font-mono text-[11px] font-bold opacity-80">
                {testResult.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3.5">
          {!canStoreKeys && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Set CREDENTIALS_SECRET in environment to save encrypted credentials in database.
            </div>
          )}

          {/* API Key */}
          <FormField
            label="API Key / Secret Token"
            helperText={
              provider.hasApiKey
                ? `Key is stored securely (${provider.apiKeyMasked}). Leave blank to keep current key.`
                : 'Keys are encrypted on the server with AES-256-GCM.'
            }
          >
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    provider.hasApiKey
                      ? `${provider.apiKeyMasked} (leave blank to keep stored key)`
                      : `Enter ${provider.displayName} API key`
                  }
                  autoComplete="off"
                  spellCheck={false}
                  disabled={!canStoreKeys}
                  className="pr-10 font-mono text-xs rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-ink-3 transition-colors hover:text-ink"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {provider.hasApiKey && provider.source === 'database' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearKey}
                  disabled={isSaving}
                  title="Remove stored key"
                  className="rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              {info.docsUrl && (
                <a
                  href={info.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs text-ink-2 hover:text-ink shrink-0"
                  title={`Open ${info.docsLabel}`}
                >
                  <span>Get Key</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </FormField>

          {/* Model and Host Grid - relative z-20 so SelectField dropdown list floats visibly */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 relative z-20">
            <div className="relative">
              {modelOptions.length > 0 ? (
                <SelectField
                  label="Active Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  options={modelOptions}
                  placement="auto"
                />
              ) : (
                <FormField label="Active Model">
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. default"
                    className="font-mono text-xs rounded-md"
                  />
                </FormField>
              )}
            </div>

            <div>
              <FormField label="Endpoint / Base URL">
                <Input
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder={info.defaultHost || 'https://...'}
                  className="font-mono text-xs rounded-md"
                />
              </FormField>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
            <span className="text-[11px] text-ink-3">
              Source:{' '}
              <strong className="font-semibold text-ink-2">
                {provider.source === 'database' ? 'Database (UI configured)' : 'Environment variable'}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              {!provider.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save(true)}
                  disabled={isSaving || !canStoreKeys}
                  className="gap-1 rounded-md text-xs"
                >
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  <span>Save & Make Active</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => save(false)}
                disabled={!dirty || isSaving || !canStoreKeys}
                className="gap-1.5 rounded-md px-4 text-xs"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Live Test Prompt Playground - Compact, Clean, rounded-md, NO shadows */}
      <div className="rounded-md border border-hairline bg-surface p-4 space-y-3 relative z-0">
        <div className="flex items-center justify-between border-b border-hairline pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Test Prompt Playground
            </h3>
          </div>
          {playgroundResponse && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Success</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-2">{playgroundResponse.latencyMs}ms</span>
              <span className="text-ink-3">·</span>
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-ink-3">
                {playgroundResponse.modelUsed}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Integrated Prompt Console */}
          <div className="rounded-md border border-hairline bg-surface overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
            <textarea
              value={playgroundPrompt}
              onChange={(e) => setPlaygroundPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!playgroundLoading && playgroundPrompt.trim() && provider.configured) {
                    executePlaygroundPrompt();
                  }
                }
              }}
              rows={2}
              placeholder="Enter a test prompt to verify generation..."
              className="w-full resize-none border-none bg-transparent p-3 text-xs text-ink placeholder:text-ink-3/50 focus:outline-none focus:ring-0"
            />
            <div className="flex items-center justify-between border-t border-hairline bg-surface-2/50 px-3 py-2">
              <span className="text-[11px] text-ink-3 flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-2 font-medium">
                  Enter ↵
                </kbd>
                <span>to run test</span>
              </span>

              <Button
                size="sm"
                onClick={executePlaygroundPrompt}
                disabled={playgroundLoading || !playgroundPrompt.trim() || !provider.configured}
                className="gap-1.5 rounded-md text-xs px-3.5 py-1"
              >
                {playgroundLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{playgroundLoading ? 'Running...' : 'Run Test'}</span>
              </Button>
            </div>
          </div>

          {playgroundResponse && (
            <div className="rounded-md border border-hairline bg-surface-2 p-3 text-xs leading-relaxed text-ink relative">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-hairline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  AI Response Output
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(playgroundResponse.reply)}
                  className="cursor-pointer text-[11px] text-ink-3 hover:text-ink flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="whitespace-pre-wrap">{playgroundResponse.reply}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
