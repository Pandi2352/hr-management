import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AiProvider,
  type ProviderOverride,
  type ProviderTestResult,
} from './ai-provider.interface';
import { LoggerHelper } from '../../../common/logger';

export interface AnthropicConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  timeoutMs: number;
}

@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly id = 'anthropic' as const;
  readonly displayName = 'Anthropic (Claude)';
  private readonly logger = LoggerHelper.Instance.child(AnthropicProvider.name);
  private readonly envCfg: AnthropicConfig;

  constructor(configService: ConfigService) {
    const apiKey = (configService.get<string>('ANTHROPIC_API_KEY', '') || '').trim();
    this.envCfg = {
      apiKey,
      baseUrl: configService.get<string>('ANTHROPIC_BASE_URL', 'https://api.anthropic.com/v1'),
      model: configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022'),
      enabled: apiKey.length > 0,
      timeoutMs: Number(configService.get<string>('ANTHROPIC_TIMEOUT_MS', '60000')) || 60000,
    };
  }

  private effective(override?: ProviderOverride): AnthropicConfig {
    if (!override) return this.envCfg;
    const apiKey = override.apiKey !== undefined ? override.apiKey : this.envCfg.apiKey;
    const baseUrl = (override.host || this.envCfg.baseUrl || 'https://api.anthropic.com/v1').trim().replace(/\/+$/, '');
    const model = (override.model || this.envCfg.model || 'claude-3-5-sonnet-20241022').trim();
    return {
      ...this.envCfg,
      apiKey,
      baseUrl,
      model,
      enabled: override.enabled === false ? false : apiKey.length > 0 || this.envCfg.enabled,
    };
  }

  isConfigured(override?: ProviderOverride): boolean {
    const eff = this.effective(override);
    return eff.enabled && eff.apiKey.length > 0;
  }

  modelLabel(override?: ProviderOverride): string {
    return this.effective(override).model;
  }

  private assertConfigured(override?: ProviderOverride): AnthropicConfig {
    const eff = this.effective(override);
    if (!eff.enabled || !eff.apiKey) {
      throw new Error('Anthropic Claude is not configured. Enter an Anthropic API key.');
    }
    return eff;
  }

  async chat(system: string, user: string, override?: ProviderOverride): Promise<string> {
    const eff = this.assertConfigured(override);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), eff.timeoutMs);
    try {
      const res = await fetch(`${eff.baseUrl}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': eff.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: eff.model,
          max_tokens: 4096,
          system: system || undefined,
          messages: [{ role: 'user', content: user }],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Anthropic Claude request failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const body = (await res.json()) as { content?: { type: string; text?: string }[] };
      const textBlock = body.content?.find((c) => c.type === 'text');
      const text = textBlock?.text?.trim() || '';
      if (!text) throw new Error('Anthropic Claude returned an empty reply.');
      return text;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Anthropic request failed.';
      this.logger.error(null, 'Anthropic chat failed', err as Error);
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }

  async test(override?: ProviderOverride): Promise<ProviderTestResult> {
    const started = Date.now();
    const eff = this.effective(override);
    if (!eff.apiKey) {
      return { ok: false, latencyMs: 0, detail: 'Enter an Anthropic API key (sk-ant-...) to test.' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${eff.baseUrl}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': eff.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: eff.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      const latencyMs = Date.now() - started;
      if (res.status === 401) {
        return { ok: false, latencyMs, detail: 'Invalid API key (401). Check the Anthropic key entered.' };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, latencyMs, detail: `Anthropic returned HTTP ${res.status}: ${text.slice(0, 150)}` };
      }
      return {
        ok: true,
        latencyMs,
        detail: `Connected to Anthropic successfully. Active model: "${eff.model}".`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        detail: err instanceof Error && /aborted/i.test(err.message)
          ? 'Connection timed out reaching Anthropic.'
          : `Network error: ${err instanceof Error ? err.message : 'Cannot reach host'}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
