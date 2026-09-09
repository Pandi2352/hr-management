import { ConfigService } from '@nestjs/config';

export type AiProviderId = 'openai' | 'opencode';

export interface AiModuleConfig {
  enabled: boolean;
  defaultProvider: AiProviderId;
}

/**
 * Module-level AI switches.
 * Env: AI_ENABLED, AI_DEFAULT_PROVIDER (openai | opencode).
 */
export function aiConfig(configService: ConfigService): AiModuleConfig {
  const raw = (configService.get<string>('AI_DEFAULT_PROVIDER', 'opencode') || 'opencode').trim().toLowerCase();
  return {
    enabled: configService.get<string>('AI_ENABLED', 'true') !== 'false',
    defaultProvider: raw === 'openai' ? 'openai' : 'opencode',
  };
}
