import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { opencodeConfig, type OpencodeProviderConfig } from '../config/opencode.config';
import {
  normalizeShortlist,
  shortlistPrompt,
  SHORTLIST_JSON_SCHEMA,
  type AiProvider,
  type ShortlistInput,
  type ShortlistResult,
} from './ai-provider.interface';
import { LoggerHelper } from '../../../common/logger';

/**
 * Opencode provider — talks to a running opencode server (free-models
 * capable) over plain HTTP (`POST /session`, `POST /session/{id}/message`).
 *
 * No SDK import on purpose: the published SDK ships ESM-only exports that
 * NestJS (CommonJS) cannot `require`, which crashed server boot. The REST
 * surface used here mirrors the SDK's own endpoints.
 *
 * Requires the server from `opencode serve` (default http://localhost:4096).
 */
const CANDIDATE_FREE_MODELS = [
  'nemotron-3.5-lightning-free',
  'nemotron-3-ultra-free',
  'big-pickle',
  'mimo-v2.5-free',
  'ling-3.0-flash-fin-free',
  'muse-spark-1.3-contributor-free',
];

/**
 * Opencode provider — talks to a running opencode server (free-models
 * capable) over plain HTTP (`POST /session`, `POST /session/{id}/message`).
 *
 * Automatically leverages available free models (nemotron-3.5-lightning-free,
 * nemotron-3-ultra-free, big-pickle, etc.) and gracefully handles rate limits.
 */
@Injectable()
export class OpencodeProvider implements AiProvider {
  readonly id = 'opencode' as const;
  readonly displayName = 'Opencode (free models)';
  private readonly logger = LoggerHelper.Instance.child(OpencodeProvider.name);
  private readonly cfg: OpencodeProviderConfig;

  constructor(configService: ConfigService) {
    this.cfg = opencodeConfig(configService);
  }

  isConfigured(): boolean {
    return this.cfg.enabled && this.cfg.baseUrl.length > 0;
  }

  modelLabel(): string {
    if (this.cfg.providerID && this.cfg.modelID) return `${this.cfg.providerID}/${this.cfg.modelID}`;
    return this.cfg.modelID || 'opencode/nemotron-3.5-lightning-free';
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Opencode provider is disabled. Check OPENCODE_* settings (see .env.example).');
    }
  }

  private base(): string {
    return this.cfg.baseUrl.replace(/\/$/, '');
  }

  private connectionError(): Error {
    return new Error(
      `Cannot reach opencode server at ${this.cfg.baseUrl}. Start it with \`opencode serve\`.`,
    );
  }

  /**
   * In-menu connection test: probes `/global/health` and checks connected models.
   */
  async test(): Promise<{ ok: boolean; latencyMs: number; detail: string }> {
    const started = Date.now();
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, detail: 'Opencode provider is disabled.' };
    }
    const get = async (path: string, timeoutMs: number): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(`${this.base()}${path}`, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    };
    try {
      const health = await get('/global/health', 10000);
      const latencyMs = Date.now() - started;
      if (health.ok) {
        const body = (await health.json().catch(() => ({}))) as { version?: string; healthy?: boolean };
        const version = typeof body.version === 'string' && body.version ? ` v${body.version}` : '';
        return { ok: true, latencyMs, detail: `Server healthy${version} — active model "${this.modelLabel()}".` };
      }
      const root = await get('/', 5000).catch(() => null);
      if (root) {
        return { ok: true, latencyMs: Date.now() - started, detail: `Server reachable — active model "${this.modelLabel()}".` };
      }
      return { ok: false, latencyMs, detail: `Server responded ${health.status}. Update the server or check OPENCODE_BASE_URL.` };
    } catch {
      return { ok: false, latencyMs: Date.now() - started, detail: `Cannot reach opencode server at ${this.cfg.baseUrl}. Start it with \`opencode serve\`.` };
    }
  }

  private async post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.base()}${path}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Opencode server responded ${res.status}. ${text.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error && /fetch failed|ECONNREFUSED|aborted/i.test(err.message)) {
        throw this.connectionError();
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Posts message to a session while watching /session/status for fast rate-limit detection.
   */
  private async postMessageWithWatcher<T>(sessionId: string, body: unknown, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Poll session status every 1200ms to detect free-tier limit / retry state without hanging
    const statusInterval = setInterval(async () => {
      try {
        const sRes = await fetch(`${this.base()}/session/status`, { signal: AbortSignal.timeout(2000) });
        if (sRes.ok) {
          const statusMap = (await sRes.json().catch(() => ({}))) as Record<string, any>;
          const s = statusMap[sessionId];
          if (s && (s.type === 'retry' || s.action?.reason === 'free_tier_limit')) {
            controller.abort(new Error(s.message || 'Free usage exceeded on this model.'));
          }
        }
      } catch {
        // ignore watcher check errors
      }
    }, 1200);

    try {
      const res = await fetch(`${this.base()}/session/${sessionId}/message`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Opencode server responded ${res.status}. ${text.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error && /aborted/i.test(err.message) && controller.signal.reason instanceof Error) {
        throw controller.signal.reason;
      }
      if (err instanceof Error && /fetch failed|ECONNREFUSED/i.test(err.message)) {
        throw this.connectionError();
      }
      throw err;
    } finally {
      clearInterval(statusInterval);
      clearTimeout(timer);
    }
  }

  /**
   * Executes a prompt with candidate free-model fallback.
   */
  private async executeWithModelFallback<T>(
    title: string,
    bodyFactory: (modelId: string) => Record<string, unknown>,
  ): Promise<T> {
    this.assertConfigured();

    const configuredModel = this.cfg.modelID || 'nemotron-3.5-lightning-free';
    const modelsToTry = [
      configuredModel,
      ...CANDIDATE_FREE_MODELS.filter((m) => m !== configuredModel),
    ];

    let lastError: Error | null = null;

    for (const modelId of modelsToTry) {
      let sessionId: string | undefined;
      try {
        const session = await this.post<{ id?: string }>('/session', { title }, 10000);
        sessionId = session?.id;
        if (!sessionId) continue;

        const body = bodyFactory(modelId);
        const result = await this.postMessageWithWatcher<T>(sessionId, body, this.cfg.timeoutMs);
        return result;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(null, `OpenCode model ${modelId} failed: ${lastError.message}, trying next free model...`);
      } finally {
        if (sessionId) {
          fetch(`${this.base()}/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
        }
      }
    }

    throw new Error(
      lastError?.message || 'All OpenCode free models are currently busy or rate-limited. Please try again in a few moments.',
    );
  }

  /** Free-form chat for copilots (plain text answer). */
  async chat(system: string, user: string): Promise<string> {
    const providerID = this.cfg.providerID || 'opencode';

    const result = await this.executeWithModelFallback<unknown>('AskHR Copilot', (modelID) => ({
      system,
      parts: [{ type: 'text', text: user }],
      model: { providerID, modelID },
    }));

    const text = this.extractText(result);
    if (!text) throw new Error('OpenCode returned an empty reply. Try asking again.');
    return text.slice(0, 2000);
  }

  /** Plain-text answer out of response parts, filtering out reasoning chain-of-thought. */
  private extractText(result: unknown): string {
    if (!result || typeof result !== 'object') return '';
    const root = result as Record<string, unknown>;
    const parts = (Array.isArray(root.parts) ? root.parts : []) as { type?: string; data?: unknown; text?: string }[];
    const texts = parts
      .filter((part) => part.type !== 'reasoning' && part.type !== 'step-start' && part.type !== 'step-finish')
      .map((part) => {
        if (typeof part?.text === 'string' && part.text.trim()) return part.text.trim();
        if (typeof part?.data === 'string' && part.data.trim()) return part.data.trim();
        if (part?.data && typeof part.data === 'object') {
          const data = part.data as Record<string, unknown>;
          if (typeof data.text === 'string' && data.text.trim()) return data.text.trim();
        }
        return '';
      })
      .filter(Boolean);
    if (texts.length > 0) return texts.join('\n\n');
    if (typeof root.text === 'string' && root.text.trim()) return root.text.trim();
    return '';
  }

  async shortlist(input: ShortlistInput): Promise<ShortlistResult> {
    const providerID = this.cfg.providerID || 'opencode';

    const promptText = [
      shortlistPrompt(input),
      '',
      'IMPORTANT: Respond ONLY with a valid JSON object matching this schema (no markdown, no explanation):',
      '{"score": number (0-100), "recommendation": "SHORTLIST"|"MAYBE"|"REJECT", "strengths": ["string"], "gaps": ["string"], "summary": "two sentence summary"}',
    ].join('\n');

    const result = await this.executeWithModelFallback<unknown>(`Shortlist ${input.candidateName}`, (modelID) => ({
      parts: [{ type: 'text', text: promptText }],
      model: { providerID, modelID },
    }));

    const parsed = this.extractStructured(result);
    if (parsed) return normalizeShortlist(parsed);
    throw new Error('OpenCode returned no structured output. Check model response.');
  }

  /** Accepts SDK-style `{info, parts}` as well as flatter server shapes, prioritizing text parts. */
  private extractStructured(result: unknown): unknown {
    if (!result || typeof result !== 'object') return null;
    const root = result as Record<string, unknown>;
    const info = root.info as Record<string, unknown> | undefined;
    const structured = info?.structured_output ?? info?.structuredOutput ?? root.structured_output ?? root.structuredOutput;
    if (structured && typeof structured === 'object') return structured;

    const parts = (Array.isArray(root.parts) ? root.parts : []) as { type?: string; data?: unknown; text?: string }[];
    // Check non-reasoning parts first
    const contentParts = parts.filter((p) => p.type !== 'reasoning');
    for (const part of [...contentParts, ...parts]) {
      const text = typeof part?.text === 'string' ? part.text : typeof part?.data === 'string' ? part.data : '';
      if (!text) continue;
      const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          // keep looking
        }
      }
    }
    if (typeof root.text === 'string') {
      const cleaned = root.text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          // fall through
        }
      }
    }
    return null;
  }
}
