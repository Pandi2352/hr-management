import { ConfigService } from '@nestjs/config';

export interface OpenAiProviderConfig {
  enabled: boolean;
  /** Present only — never returned to clients. */
  hasApiKey: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

/**
 * ChatGPT provider configuration.
 * Env: OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL, OPENAI_TIMEOUT_MS.
 */
export function openAiConfig(configService: ConfigService): OpenAiProviderConfig {
  const apiKey = (configService.get<string>('OPENAI_API_KEY', '') || '').trim();
  return {
    enabled: apiKey.length > 0,
    hasApiKey: apiKey.length > 0,
    apiKey,
    baseUrl: configService.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    model: configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
    timeoutMs: Number(configService.get<string>('OPENAI_TIMEOUT_MS', '60000')) || 60000,
  };
}
