import { ConfigService } from '@nestjs/config';

export interface OllamaProviderConfig {
  enabled: boolean;
  /** Present only — the key itself is never returned to clients. */
  hasApiKey: boolean;
  apiKey: string;
  /** `https://ollama.com` for the cloud, or a local host such as `http://localhost:11434`. */
  host: string;
  /** True when pointed at Ollama's hosted API, which requires a key. */
  isCloud: boolean;
  model: string;
  timeoutMs: number;
}

/**
 * Ollama provider configuration, cloud or self-hosted.
 *
 * The same API serves both: `https://ollama.com` runs the hosted models and
 * needs a bearer token, a local `http://localhost:11434` runs your own and
 * needs nothing. Rather than shipping two providers that differ by one header,
 * the host decides, and the key is only required when the host is the cloud.
 *
 * Env: OLLAMA_ENABLED, OLLAMA_API_KEY, OLLAMA_HOST, OLLAMA_MODEL,
 * OLLAMA_TIMEOUT_MS.
 */
export function ollamaConfig(configService: ConfigService): OllamaProviderConfig {
  const apiKey = (configService.get<string>('OLLAMA_API_KEY', '') || '').trim();
  const host = (configService.get<string>('OLLAMA_HOST', 'https://ollama.com') || 'https://ollama.com').trim();

  // Anything not on localhost is treated as hosted, so a private deployment
  // behind a domain is asked for its key rather than silently going unauthenticated.
  const isCloud = !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(host);

  const explicitlyDisabled = configService.get<string>('OLLAMA_ENABLED', '') === 'false';

  return {
    // A cloud host with no key cannot work, so the provider reports itself
    // unconfigured instead of failing on the first real request.
    enabled: !explicitlyDisabled && host.length > 0 && (!isCloud || apiKey.length > 0),
    hasApiKey: apiKey.length > 0,
    apiKey,
    host,
    isCloud,
    model: (configService.get<string>('OLLAMA_MODEL', 'gpt-oss:120b') || 'gpt-oss:120b').trim(),
    timeoutMs: Number(configService.get<string>('OLLAMA_TIMEOUT_MS', '90000')) || 90000,
  };
}
