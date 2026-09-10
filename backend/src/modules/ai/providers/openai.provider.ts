import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openAiConfig, type OpenAiProviderConfig } from '../config/openai.config';
import {
  type AiProvider,
} from './ai-provider.interface';
import { LoggerHelper } from '../../../common/logger';

/** ChatGPT provider — OpenAI chat completions with JSON-object output. */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly id = 'openai' as const;
  readonly displayName = 'ChatGPT (OpenAI)';
  private readonly logger = LoggerHelper.Instance.child(OpenAiProvider.name);
  private readonly cfg: OpenAiProviderConfig;

  constructor(configService: ConfigService) {
    this.cfg = openAiConfig(configService);
  }

  isConfigured(): boolean {
    return this.cfg.enabled && this.cfg.hasApiKey;
  }

  modelLabel(): string {
    return this.cfg.model;
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('ChatGPT is not configured. Set OPENAI_API_KEY (see .env.example).');
    }
  }

  private async postChat(messages: { role: string; content: string }[], extra: Record<string, unknown> = {}): Promise<string> {
    this.assertConfigured();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify({ model: this.cfg.model, temperature: 0.3, messages, ...extra }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`ChatGPT request failed (${res.status}). ${text.slice(0, 200)}`);
      }
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = body.choices?.[0]?.message?.content?.trim() || '';
      if (!content) throw new Error('ChatGPT returned an empty reply.');
      return content;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ChatGPT request failed.';
      this.logger.error(null, 'ChatGPT chat failed', err as Error);
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Free-form chat for copilots (system + user turns, plain text out). */
  async chat(system: string, user: string): Promise<string> {
    return this.postChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    );
  }

  /**
   * In-menu connection test: lists models (cheapest authenticated call).
   * Never throws — failures come back as `{ok: false}` for inline display.
   */
  async test(): Promise<{ ok: boolean; latencyMs: number; detail: string }> {
    const started = Date.now();
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, detail: 'Set OPENAI_API_KEY to enable.' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/models`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
      });
      const latencyMs = Date.now() - started;
      if (res.status === 401) {
        return { ok: false, latencyMs, detail: 'Invalid API key (401). Check OPENAI_API_KEY.' };
      }
      if (!res.ok) {
        return { ok: false, latencyMs, detail: `OpenAI responded ${res.status}. Check key / network.` };
      }
      const body = (await res.json().catch(() => ({}))) as { data?: unknown[] };
      const count = Array.isArray(body.data) ? body.data.length : 0;
      return { ok: true, latencyMs, detail: `Connected — ${count} models available, chat model "${this.cfg.model}".` };
    } catch (err: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        detail: err instanceof Error && /aborted/i.test(err.message) ? 'Timed out reaching OpenAI.' : 'Cannot reach OpenAI. Check network / base URL.',
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
