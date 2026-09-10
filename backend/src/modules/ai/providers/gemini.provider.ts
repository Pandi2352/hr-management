import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AiProvider,
  type ProviderOverride,
  type ProviderTestResult,
} from './ai-provider.interface';
import { LoggerHelper } from '../../../common/logger';

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  timeoutMs: number;
}

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;
  readonly displayName = 'Google Gemini';
  private readonly logger = LoggerHelper.Instance.child(GeminiProvider.name);
  private readonly envCfg: GeminiConfig;

  constructor(configService: ConfigService) {
    const apiKey = (
      configService.get<string>('GEMINI_API_KEY', '') ||
      configService.get<string>('GOOGLE_API_KEY', '') ||
      ''
    ).trim();
    this.envCfg = {
      apiKey,
      baseUrl: configService.get<string>(
        'GEMINI_BASE_URL',
        'https://generativelanguage.googleapis.com/v1beta/openai',
      ),
      model: configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash'),
      enabled: apiKey.length > 0,
      timeoutMs: Number(configService.get<string>('GEMINI_TIMEOUT_MS', '60000')) || 60000,
    };
  }

  private effective(override?: ProviderOverride): GeminiConfig {
    if (!override) return this.envCfg;
    const apiKey = override.apiKey !== undefined ? override.apiKey : this.envCfg.apiKey;
    const baseUrl = (
      override.host ||
      this.envCfg.baseUrl ||
      'https://generativelanguage.googleapis.com/v1beta/openai'
    )
      .trim()
      .replace(/\/+$/, '');
    const model = (override.model || this.envCfg.model || 'gemini-2.5-flash').trim();
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

  private assertConfigured(override?: ProviderOverride): GeminiConfig {
    const eff = this.effective(override);
    if (!eff.enabled || !eff.apiKey) {
      throw new Error('Google Gemini is not configured. Enter a Gemini API key.');
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
        throw new Error(`Google Gemini request failed (${res.status}): ${text.slice(0, 200)}`);
      }

      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = body.choices?.[0]?.message?.content?.trim() || '';
      if (!content) throw new Error('Google Gemini returned an empty reply.');
      return content;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gemini request failed.';
      this.logger.error(null, 'Gemini chat failed', err as Error);
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }

  async test(override?: ProviderOverride): Promise<ProviderTestResult> {
    const started = Date.now();
    const eff = this.effective(override);
    if (!eff.apiKey) {
      return { ok: false, latencyMs: 0, detail: 'Enter a Google Gemini API key (AIzaSy...) to test.' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${eff.baseUrl}/models`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${eff.apiKey}` },
      });
      const latencyMs = Date.now() - started;
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, latencyMs, detail: `Invalid Gemini API key (${res.status}). Check key permissions.` };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, latencyMs, detail: `Gemini API returned HTTP ${res.status}: ${text.slice(0, 150)}` };
      }
      const body = (await res.json().catch(() => ({}))) as { data?: unknown[] };
      const count = Array.isArray(body.data) ? body.data.length : 0;
      return {
        ok: true,
        latencyMs,
        detail: `Connected to Google Gemini successfully (${count} models available). Active model: "${eff.model}".`,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        detail: err instanceof Error && /aborted/i.test(err.message)
          ? 'Connection timed out reaching Google Gemini.'
          : `Network error: ${err instanceof Error ? err.message : 'Cannot reach host'}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
