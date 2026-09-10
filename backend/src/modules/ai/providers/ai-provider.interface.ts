import type { AiProviderId } from '../config/ai.config';

/**
 * Values entered in the settings UI, layered over the environment.
 *
 * Passed per call rather than held on the provider, because providers are
 * singletons shared by every request: storing the current organization's key on
 * the instance would let one tenant's call pick up another's credential.
 *
 * Every field is optional and any provider may ignore it — the two older
 * providers still read only the environment, and a method that declares fewer
 * parameters satisfies this interface unchanged.
 */
export interface ProviderOverride {
  apiKey?: string;
  model?: string;
  host?: string;
  enabled?: boolean;
}

export interface ProviderTestResult {
  ok: boolean;
  latencyMs: number;
  detail: string;
}

/**
 * What every AI provider must offer.
 *
 * Deliberately small. Candidate screening used to live here as a `shortlist`
 * method, and it has been removed along with the rest of the AI features: a
 * provider now only has to say whether it is configured, prove it, and hold a
 * conversation. Features are built on top of that, not baked into it.
 */
export interface AiProvider {
  readonly id: AiProviderId;
  readonly displayName: string;
  /** Credentials/endpoint present (no network call). */
  isConfigured(override?: ProviderOverride): boolean;
  /** Model label shown in the UI (no secrets). */
  modelLabel(override?: ProviderOverride): string;
  /** Live connectivity/credential check for the Test button. */
  test(override?: ProviderOverride): Promise<ProviderTestResult>;
  /** One prompt, one plain-text answer. The primitive everything else builds on. */
  chat(system: string, user: string, override?: ProviderOverride): Promise<string>;
}
