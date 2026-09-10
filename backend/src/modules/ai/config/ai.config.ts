import { ConfigService } from '@nestjs/config';

export type AiProviderId = 'openai' | 'opencode' | 'ollama';

/** Every id, in the order the settings page lists them. */
export const AI_PROVIDER_IDS: AiProviderId[] = ['openai', 'ollama', 'opencode'];

export interface AiModuleConfig {
  enabled: boolean;
  defaultProvider: AiProviderId;
}

/**
 * Module-level AI switches.
 * Env: AI_ENABLED, AI_DEFAULT_PROVIDER (openai | ollama | opencode).
 *
 * An unrecognised value falls back to opencode rather than throwing: a typo in
 * one env var should not stop the server booting, and the settings page shows
 * which provider is actually default.
 */
export function aiConfig(configService: ConfigService): AiModuleConfig {
  const raw = (configService.get<string>('AI_DEFAULT_PROVIDER', 'opencode') || 'opencode').trim().toLowerCase();
  const defaultProvider = (AI_PROVIDER_IDS as string[]).includes(raw)
    ? (raw as AiProviderId)
    : 'opencode';
  return {
    enabled: configService.get<string>('AI_ENABLED', 'true') !== 'false',
    defaultProvider,
  };
}
