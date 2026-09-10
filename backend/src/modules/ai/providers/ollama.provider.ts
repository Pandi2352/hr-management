import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ollamaConfig, type OllamaProviderConfig } from '../config/ollama.config';
import { OLLAMA_DEFAULT_MODEL } from '../config/ollama.models';
import {
  type AiProvider,
  type ProviderOverride,
  type ProviderTestResult,
} from './ai-provider.interface';
import { extractJsonObject, stripReasoning } from './provider-json.util';
import { asProviderError, normalizeBaseUrl, requestJson } from './provider-http.util';
import { LoggerHelper } from '../../../common/logger';

interface OllamaChatResponse {
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

interface OllamaTagsResponse {
  models?: { name?: string; model?: string }[];
}

const LOCAL_HOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i;

/**
 * Ollama provider — hosted models at ollama.com, or your own at localhost.
 *
 * Speaks the REST API directly rather than importing the `ollama` package. The
 * same reasoning as the opencode provider: the published client is ESM-only and
 * cannot be `require`d from this CommonJS build, and it would crash boot. The
 * two endpoints used here are exactly what that client calls, so nothing is
 * given up by talking to them directly, and no dependency is added for two
 * POSTs.
 *
 * Streaming is deliberately off. Both callers — candidate shortlisting and the
 * HR copilot — need a whole answer before they can do anything with it, so
 * streaming would only add reassembly work for no benefit.
 */
@Injectable()
export class OllamaProvider implements AiProvider {
  readonly id = 'ollama' as const;
  readonly displayName = 'Ollama';
  private readonly logger = LoggerHelper.Instance.child(OllamaProvider.name);
  private readonly envCfg: OllamaProviderConfig;

  constructor(configService: ConfigService) {
    this.envCfg = ollamaConfig(configService);
  }

  /**
   * The configuration for one call: environment defaults, with anything saved
   * in the settings UI layered on top.
   *
   * Derived per call and never stored on the instance. The provider is a
   * singleton shared by every request, so holding one organization's key here
   * would let another organization's call reuse that credential.
   */
  private effective(override?: ProviderOverride): OllamaProviderConfig {
    if (!override) return this.envCfg;

    const host = (override.host || this.envCfg.host).trim();
    const apiKey = override.apiKey !== undefined ? override.apiKey : this.envCfg.apiKey;
    const isCloud = !LOCAL_HOST_PATTERN.test(host);

    return {
      ...this.envCfg,
      apiKey,
      hasApiKey: apiKey.length > 0,
      host,
      isCloud,
      model: (override.model || this.envCfg.model || OLLAMA_DEFAULT_MODEL).trim(),
      // A cloud host with no key cannot work, so it reports itself
      // unconfigured rather than failing on the first real request.
      enabled:
        override.enabled === false ? false : host.length > 0 && (!isCloud || apiKey.length > 0),
    };
  }

  isConfigured(override?: ProviderOverride): boolean {
    return this.effective(override).enabled;
  }

  modelLabel(override?: ProviderOverride): string {
    return this.effective(override).model;
  }

  /** What an operator has to do to make this provider work. */
  configurationHint(override?: ProviderOverride): string {
    const cfg = this.effective(override);
    if (cfg.isCloud && !cfg.hasApiKey) {
      return 'Add your ollama.com API key below to enable.';
    }
    if (!cfg.isCloud) {
      return `Run \`ollama serve\` at ${cfg.host} and pull ${cfg.model}.`;
    }
    return `Cloud models at ${cfg.host}.`;
  }

  /** Cloud or self-hosted, for messages. Derived, because the host can be overridden. */
  private label(cfg: OllamaProviderConfig): string {
    return cfg.isCloud ? 'Ollama Cloud' : 'Ollama (self-hosted)';
  }

  private headers(cfg: OllamaProviderConfig): Record<string, string> {
    // A local server takes no auth, and sending an empty bearer to one that
    // does check would fail in a way that looks like a bad key.
    return cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};
  }

  /**
   * One chat round trip, returning the assistant's text.
   *
   * `format` is passed through so shortlisting can ask for JSON while the
   * copilot asks for prose. Ollama's `format: 'json'` constrains decoding
   * rather than merely requesting politely, which is why shortlisting parses
   * reliably without retries.
   */
  private async chatOnce(
    cfg: OllamaProviderConfig,
    messages: { role: string; content: string }[],
    format?: 'json',
  ): Promise<string> {
    if (!cfg.enabled) {
      throw new Error(`${this.label(cfg)} is not configured. ${this.configurationHint()}`);
    }

    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      stream: false,
      options: { temperature: format === 'json' ? 0.2 : 0.3 },
    };
    if (format) body.format = format;

    let response: OllamaChatResponse;
    try {
      response = await requestJson<OllamaChatResponse>(`${normalizeBaseUrl(cfg.host)}/api/chat`, {
        method: 'POST',
        headers: this.headers(cfg),
        body,
        timeoutMs: cfg.timeoutMs,
        label: this.label(cfg),
      });
    } catch (err) {
      const wrapped = asProviderError(err, this.label(cfg), cfg.timeoutMs);
      this.logger.error(null, 'Ollama chat failed', wrapped);
      throw new Error(this.explain(cfg, wrapped));
    }

    // A 200 carrying an `error` field: a model that is not pulled, mostly.
    if (response.error) {
      throw new Error(`${this.label(cfg)}: ${response.error}`);
    }

    const content = stripReasoning(response.message?.content?.trim() || '');
    if (!content) {
      throw new Error(`${this.label(cfg)} returned an empty reply. Try again, or pick another model.`);
    }
    return content;
  }

  /** Turns a transport error into something the operator can act on. */
  private explain(cfg: OllamaProviderConfig, err: { message: string; status?: number }): string {
    if (err.status === 401 || err.status === 403) {
      return `${this.label(cfg)} rejected the API key (${err.status}). Check the key you saved.`;
    }
    if (err.status === 404) {
      return `${this.label(cfg)} does not have model "${cfg.model}". Pick a different model.`;
    }
    if (err.status === 429) {
      return `${this.label(cfg)} is rate limiting this key. Wait a moment and retry.`;
    }
    return err.message;
  }

  /** Free-form chat for copilots (system + user turns, plain text out). */
  async chat(system: string, user: string, override?: ProviderOverride): Promise<string> {
    const cfg = this.effective(override);
    const content = await this.chatOnce(cfg, [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    return content.slice(0, 2000);
  }

  /**
   * In-menu connection test.
   *
   * Cloud and self-hosted are probed differently, because the obvious endpoint
   * lies for one of them. `GET /api/tags` on ollama.com answers 200 with the
   * full catalogue *without checking the token*, so testing a deliberately
   * invalid key reported "Connected — 19 models available", precisely the
   * answer this button exists to not give. The cloud is therefore probed with
   * the smallest possible generation, capped at one token: the cheapest call
   * that genuinely exercises the credential and the model name.
   *
   * A local server has no credential to check, so the model list is right
   * there. It is free, and "nothing pulled yet" is a real failure worth
   * reporting.
   *
   * Never throws. A failing provider is information the settings page renders
   * inline, not an exception for the request pipeline to turn into a 500.
   */
  async test(override?: ProviderOverride): Promise<ProviderTestResult> {
    const started = Date.now();
    const cfg = this.effective(override);

    if (!cfg.enabled) {
      return { ok: false, latencyMs: 0, detail: this.configurationHint(override) };
    }

    return cfg.isCloud ? this.testCloud(cfg, started) : this.testLocal(cfg, started);
  }

  /** Cloud: one capped generation, which actually validates key and model. */
  private async testCloud(cfg: OllamaProviderConfig, started: number): Promise<ProviderTestResult> {
    try {
      const body = await requestJson<OllamaChatResponse>(`${normalizeBaseUrl(cfg.host)}/api/chat`, {
        method: 'POST',
        headers: this.headers(cfg),
        body: {
          model: cfg.model,
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
          // One token is enough to prove the round trip works.
          options: { num_predict: 1 },
        },
        timeoutMs: 30000,
        label: this.label(cfg),
      });
      const latencyMs = Date.now() - started;

      if (body.error) {
        return { ok: false, latencyMs, detail: `${this.label(cfg)}: ${body.error}` };
      }
      return { ok: true, latencyMs, detail: `Connected — key accepted, "${cfg.model}" responded.` };
    } catch (err) {
      const wrapped = asProviderError(err, this.label(cfg), 30000);
      return { ok: false, latencyMs: Date.now() - started, detail: this.explain(cfg, wrapped) };
    }
  }

  /** Self-hosted: list what is pulled, which is free and genuinely informative. */
  private async testLocal(cfg: OllamaProviderConfig, started: number): Promise<ProviderTestResult> {
    try {
      const body = await requestJson<OllamaTagsResponse>(`${normalizeBaseUrl(cfg.host)}/api/tags`, {
        headers: this.headers(cfg),
        timeoutMs: 20000,
        label: this.label(cfg),
      });
      const latencyMs = Date.now() - started;
      const names = (body.models || []).map((m) => m.name || m.model).filter(Boolean) as string[];

      if (names.length === 0) {
        return {
          ok: false,
          latencyMs,
          detail: `Server reachable but no models pulled. Run \`ollama pull ${cfg.model}\`.`,
        };
      }

      const hasModel = names.some((n) => n === cfg.model || n.startsWith(`${cfg.model}:`));
      return {
        ok: true,
        latencyMs,
        detail: hasModel
          ? `Connected — ${names.length} models available, using "${cfg.model}".`
          : `Connected — ${names.length} models available, but "${cfg.model}" is not among them.`,
      };
    } catch (err) {
      const wrapped = asProviderError(err, this.label(cfg), 20000);
      return { ok: false, latencyMs: Date.now() - started, detail: this.explain(cfg, wrapped) };
    }
  }
}
