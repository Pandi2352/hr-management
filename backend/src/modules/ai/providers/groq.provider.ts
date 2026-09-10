import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AiProvider,
  type ProviderOverride,
  type ProviderTestResult,
} from './ai-provider.interface';
import { LoggerHelper } from '../../../common/logger';

export interface GroqConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  timeoutMs: number;
}

@Injectable()
export class GroqProvider implements AiProvider {
  readonly id = 'groq' as const;
  readonly displayName = 'Groq (LPU Ultra-Fast)';
  private readonly logger = LoggerHelper.Instance.child(GroqProvider.name);
  private readonly envCfg: GroqConfig;

  constructor(configService: ConfigService) {
    const apiKey = (configService.get<string>('GROQ_API_KEY', '') || '').trim();
    this.envCfg = {
      apiKey,
      baseUrl: configService.get<string>('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
      model: configService.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile'),
      enabled: apiKey.length > 0,
      timeoutMs: Number(configService.get<string>('GROQ_TIMEOUT_MS', '60000')) || 60000,
    };
  }

  private effective(override?: ProviderOverride): GroqConfig {
    if (!override) return this.envCfg;
    const apiKey = override.apiKey !== undefined ? override.apiKey : this.envCfg.apiKey;
    const baseUrl = (override.host || this.envCfg.baseUrl || 'https://api.groq.com/openai/v1')
      .trim()
      .replace(/\/+$/, '');
    const model = (override.model || this.envCfg.model || 'llama-3.3-70b-versatile').trim();
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

  private assertConfigured(override?: ProviderOverride): GroqConfig {
    const eff = this.effective(override);
    if (!eff.enabled || !eff.apiKey) {
      throw new Error('Groq is not configured. Enter a Groq API key.');
    }
    return eff;
  }

  async chat(system: string, user: string, override?: ProviderOverride): Promise<string> {
    const eff = this.assertConfigured(override);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), eff.timeoutMs);
    try {
      const messages: { role: string; content: string }[] = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: user });

      const res = await fetch(`${eff.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${eff.apiKey}`,
        },
        body: JSON.stringify({
          model: eff.model,
          temperature: 0.3,
          messages,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Groq request failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = body.choices?.[0]?.message?.content?.trim() || '';
      if (!content) throw new Error('Groq returned an empty reply.');
      return content;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Groq chat failed.';
      this.logger.error(null, 'Groq chat failed', err as Error);
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }

  async test(override?: ProviderOverride): Promise<ProviderTestResult> {
    const started = Date.now();
    const eff = this.effective(override);
    if (!eff.apiKey) {
      return { ok: false, latencyMs: 0, detail: 'Enter a Groq API key (gsk_...) to test.' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${eff.baseUrl}/models`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${eff.apiKey}` },
      });
      const latencyMs = Date.now() - started;
      if (res.status === 401) {
        return { ok: false, latencyMs, detail: 'Invalid Groq API key (401). Check the key entered.' };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, latencyMs, detail: `Groq returned HTTP ${res.status}: ${text.slice(0, 150)}` };
      }
      const body = (await res.json().catch(() => ({}))) as { data?: unknown[] };
      const count = Array.isArray(body.data) ? body.data.length : 0;
      return {
        ok: true,
        latencyMs,
        detail: `Connected to Groq LPU engine successfully (${count} models available). Active model: "${eff.model}".`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        detail: err instanceof Error && /aborted/i.test(err.message)
          ? 'Connection timed out reaching Groq.'
          : `Network error: ${err instanceof Error ? err.message : 'Cannot reach host'}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
