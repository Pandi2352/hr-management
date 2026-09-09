import { ConfigService } from '@nestjs/config';

export interface OpencodeProviderConfig {
  enabled: boolean;
  /** Opencode server URL (the SDK talks to a running server, default :4096). */
  baseUrl: string;
  /** Optional `providerID/modelID` override, e.g. `anthropic/claude-3-5-sonnet-20241022`. */
  providerID?: string;
  modelID?: string;
  timeoutMs: number;
}

/**
 * Opencode provider configuration (free-models capable server).
 * Env: OPENCODE_ENABLED, OPENCODE_BASE_URL, OPENCODE_MODEL, OPENCODE_TIMEOUT_MS.
 */
export function opencodeConfig(configService: ConfigService): OpencodeProviderConfig {
  const rawModel = (configService.get<string>('OPENCODE_MODEL', 'opencode/nemotron-3.5-lightning-free') || 'opencode/nemotron-3.5-lightning-free').trim();
  let providerID = 'opencode';
  let modelID = 'nemotron-3.5-lightning-free';
  if (rawModel.includes('/')) {
    const [p, ...rest] = rawModel.split('/');
    providerID = p || 'opencode';
    modelID = rest.join('/') || 'nemotron-3.5-lightning-free';
  } else if (rawModel) {
    providerID = 'opencode';
    modelID = rawModel;
  }

  return {
    enabled: configService.get<string>('OPENCODE_ENABLED', 'true') !== 'false',
    baseUrl: configService.get<string>('OPENCODE_BASE_URL', 'http://localhost:4096'),
    providerID,
    modelID,
    timeoutMs: Number(configService.get<string>('OPENCODE_TIMEOUT_MS', '60000')) || 60000,
  };
}
