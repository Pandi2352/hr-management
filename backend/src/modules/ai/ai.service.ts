import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { LoggerHelper } from '../../common/logger';
import { aiConfig, AI_PROVIDER_IDS, type AiModuleConfig, type AiProviderId } from './config/ai.config';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { OpencodeProvider } from './providers/opencode.provider';
import { OllamaProvider } from './providers/ollama.provider';
import type { AiProvider, ProviderOverride } from './providers/ai-provider.interface';
import { AiSettingsService } from './ai-settings.service';
import { PROVIDER_MODELS, PROVIDER_DEFAULTS } from './config/provider-models.config';

export interface ProviderStatus {
  id: AiProviderId;
  displayName: string;
  configured: boolean;
  model: string;
  isDefault: boolean;
  hint: string;
  /** True when this provider's credentials can be entered in the settings UI. */
  supportsUiConfig: boolean;
  /** Masked form only. Never the key itself. */
  apiKeyMasked: string;
  /** True when a key is stored, from the UI or the environment. */
  hasApiKey: boolean;
  /** Where the active settings came from, so the page can say so. */
  source: 'database' | 'environment';
  host: string;
  /** Suggested models for the dropdown. */
  models: { id: string; label: string; note: string }[];
}

/** Providers whose credentials can be entered directly in the UI settings tabs */
const UI_CONFIGURABLE: AiProviderId[] = [
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'ollama',
  'opencode',
];

@Injectable()
export class AiService {
  private readonly logger = LoggerHelper.Instance.child(AiService.name);
  private readonly moduleCfg: AiModuleConfig;
  private readonly providers: Record<AiProviderId, AiProvider>;

  constructor(
    configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly settingsService: AiSettingsService,
  ) {
    this.moduleCfg = aiConfig(configService);
    this.providers = {
      openai: new OpenAiProvider(configService),
      anthropic: new AnthropicProvider(configService),
      gemini: new GeminiProvider(configService),
      groq: new GroqProvider(configService),
      ollama: new OllamaProvider(configService),
      opencode: new OpencodeProvider(configService),
    };
  }

  isEnabled(): boolean {
    return this.moduleCfg.enabled;
  }

  /** Whether keys can be stored at all, so the page can explain if not. */
  canStoreKeys(): boolean {
    return this.settingsService.canStoreKeys();
  }

  /**
   * Everything the settings page needs, with no secret in it.
   */
  async listProviders(organizationId: string): Promise<ProviderStatus[]> {
    const defaultFromDb = await this.settingsService.getDefaultProvider(organizationId);

    return Promise.all(
      AI_PROVIDER_IDS.filter((id) => this.providers[id]).map(async (id) => {
        const provider = this.providers[id];
        const uiConfigurable = UI_CONFIGURABLE.includes(id);
        const override = uiConfigurable ? await this.overrideFor(organizationId, id) : undefined;
        const isDefault = defaultFromDb ? defaultFromDb === id : this.moduleCfg.defaultProvider === id;

        return {
          id,
          displayName: provider.displayName,
          configured: this.isEnabled() && provider.isConfigured(override),
          model: provider.modelLabel(override),
          isDefault,
          hint: this.hintFor(id, override),
          supportsUiConfig: uiConfigurable,
          apiKeyMasked: override?.apiKeyMasked || '',
          hasApiKey: Boolean(override?.apiKey),
          source: (override?.fromDatabase ? 'database' : 'environment') as 'database' | 'environment',
          host: override?.host || PROVIDER_DEFAULTS[id]?.host || '',
          models: PROVIDER_MODELS[id] || [],
        };
      }),
    );
  }

  /**
   * What an operator has to do to switch a provider on.
   */
  private hintFor(id: AiProviderId, override?: ProviderOverride): string {
    const provider = this.providers[id] as AiProvider & {
      configurationHint?: (o?: ProviderOverride) => string;
    };
    if (typeof provider.configurationHint === 'function') return provider.configurationHint(override);
    if (id === 'openai') return 'Enter your OpenAI API key (sk-...) to enable.';
    if (id === 'anthropic') return 'Enter your Anthropic Claude API key (sk-ant-...) to enable.';
    if (id === 'gemini') return 'Enter your Google Gemini API key (AIza...) to enable.';
    if (id === 'groq') return 'Enter your Groq Cloud API key (gsk_...) to enable ultra-fast inference.';
    if (id === 'ollama') return 'Provide host URL and optional cloud API key.';
    return 'Run the opencode server (default http://localhost:4096).';
  }

  /** Saved settings for one provider, or undefined when it is environment-only. */
  private async overrideFor(
    organizationId: string,
    id: AiProviderId,
  ): Promise<(ProviderOverride & { fromDatabase: boolean; apiKeyMasked: string; isDefault: boolean }) | undefined> {
    if (!UI_CONFIGURABLE.includes(id)) return undefined;
    const defaultHost = PROVIDER_DEFAULTS[id]?.host || '';
    const defaultModel = PROVIDER_DEFAULTS[id]?.model || '';

    const resolved = await this.settingsService.resolve(organizationId, id, {
      apiKey: '',
      model: defaultModel,
      host: defaultHost,
    });

    return {
      apiKey: resolved.apiKey,
      model: resolved.model,
      host: resolved.host,
      enabled: resolved.enabled,
      isDefault: resolved.isDefault,
      fromDatabase: resolved.fromDatabase,
      apiKeyMasked: resolved.apiKeyMasked,
    };
  }

  async saveProviderSettings(
    organizationId: string,
    id: AiProviderId,
    input: { apiKey?: string; model?: string; host?: string; enabled?: boolean; isDefault?: boolean },
    actorUserId: string,
  ): Promise<ProviderStatus[]> {
    if (!this.providers[id]) throw new BadRequestException(`Unknown AI provider "${id}".`);
    if (!UI_CONFIGURABLE.includes(id)) {
      throw new BadRequestException(
        `${this.providers[id].displayName} is configured through the environment, not this page.`,
      );
    }

    await this.settingsService.save(organizationId, id, input, actorUserId);

    await this.auditService.record({
      action: AuditAction.UPDATE,
      resourceType: AuditResource.ORGANIZATION,
      resourceId: `ai-provider:${id}`,
      organizationId,
      actorUserId,
      description: `AI provider settings updated for ${id}`,
      after: {
        model: input.model,
        host: input.host,
        enabled: input.enabled,
        isDefault: input.isDefault,
        keyChanged: input.apiKey !== undefined,
      },
    });

    return this.listProviders(organizationId);
  }

  /** Sets a provider as the default for an organization */
  async setDefaultProvider(
    organizationId: string,
    id: AiProviderId,
    actorUserId: string,
  ): Promise<ProviderStatus[]> {
    if (!this.providers[id]) throw new BadRequestException(`Unknown AI provider "${id}".`);
    await this.settingsService.setDefault(organizationId, id);

    await this.auditService.record({
      action: AuditAction.UPDATE,
      resourceType: AuditResource.ORGANIZATION,
      resourceId: `ai-provider:${id}`,
      organizationId,
      actorUserId,
      description: `AI provider ${id} set as default active provider`,
    });

    return this.listProviders(organizationId);
  }

  async clearProviderSettings(
    organizationId: string,
    id: AiProviderId,
    actorUserId: string,
  ): Promise<ProviderStatus[]> {
    if (!this.providers[id]) throw new BadRequestException(`Unknown AI provider "${id}".`);

    await this.settingsService.clear(organizationId, id);

    await this.auditService.record({
      action: AuditAction.DELETE,
      resourceType: AuditResource.ORGANIZATION,
      resourceId: `ai-provider:${id}`,
      organizationId,
      actorUserId,
      description: `AI provider settings cleared for ${id}`,
    });

    return this.listProviders(organizationId);
  }

  /**
   * Live connectivity test for the in-menu Test button.
   */
  async testProvider(
    id: AiProviderId,
    organizationId: string,
  ): Promise<{ ok: boolean; latencyMs: number; detail: string }> {
    if (!this.isEnabled()) {
      throw new BadRequestException('AI features are disabled (AI_ENABLED=false).');
    }
    const provider = this.providers[id];
    if (!provider) throw new BadRequestException(`Unknown AI provider "${id}".`);
    return provider.test(await this.overrideFor(organizationId, id));
  }

  /**
   * Live prompt generation test for confirming credentials and model outputs.
   */
  async testPrompt(
    id: AiProviderId,
    organizationId: string,
    prompt: string,
  ): Promise<{ reply: string; latencyMs: number; modelUsed: string }> {
    if (!this.isEnabled()) {
      throw new BadRequestException('AI features are disabled (AI_ENABLED=false).');
    }
    const provider = this.providers[id];
    if (!provider) throw new BadRequestException(`Unknown AI provider "${id}".`);

    const override = await this.overrideFor(organizationId, id);
    if (!provider.isConfigured(override)) {
      throw new BadRequestException(`${provider.displayName} is not configured yet. Enter credentials first.`);
    }

    const started = Date.now();
    const system = 'You are an intelligent assistant verifying connection and response speed for PeopleOS HR.';
    const reply = await provider.chat(system, prompt || 'Hello! Respond with a brief friendly acknowledgment in 1 sentence.', override);
    const latencyMs = Date.now() - started;

    return {
      reply,
      latencyMs,
      modelUsed: provider.modelLabel(override),
    };
  }

  /**
   * The provider to use, together with the settings it should run under.
   */
  async pickProviderWithSettings(
    organizationId: string,
    requested?: AiProviderId,
  ): Promise<{ provider: AiProvider; override?: ProviderOverride }> {
    if (!this.isEnabled()) {
      throw new BadRequestException('AI features are disabled (AI_ENABLED=false).');
    }

    const defaultFromDb = await this.settingsService.getDefaultProvider(organizationId);
    const id = requested || defaultFromDb || this.moduleCfg.defaultProvider;
    if (!this.providers[id]) throw new BadRequestException(`Unknown AI provider "${id}".`);

    const override = await this.overrideFor(organizationId, id);
    if (this.providers[id].isConfigured(override)) {
      return { provider: this.providers[id], override };
    }

    // Fallback search through candidate providers
    for (const candidate of AI_PROVIDER_IDS) {
      if (candidate === id || !this.providers[candidate]) continue;
      const candidateOverride = await this.overrideFor(organizationId, candidate);
      if (this.providers[candidate].isConfigured(candidateOverride)) {
        this.logger.warn(null, 'Requested AI provider is not configured; falling back', {
          requested: id,
          fallback: candidate,
        });
        return { provider: this.providers[candidate], override: candidateOverride };
      }
    }

    throw new BadRequestException(
      `${this.providers[id].displayName} is not configured. ${this.hintFor(id, override)}`,
    );
  }

  // =========================================================================
  // COMMON UNIFIED LLM HELPER METHODS (For all modules across the application)
  // =========================================================================

  /**
   * Universal plain-text chat completion helper.
   * Auto-selects the configured default provider for the organization or falls back.
   */
  async chat(
    systemPrompt: string,
    userPrompt: string,
    options?: { organizationId?: string; providerId?: AiProviderId },
  ): Promise<string> {
    const orgId = options?.organizationId || 'default';
    const { provider, override } = await this.pickProviderWithSettings(orgId, options?.providerId);
    return provider.chat(systemPrompt, userPrompt, override);
  }

  /**
   * Complete a single prompt with optional system instructions.
   */
  async complete(
    prompt: string,
    options?: { organizationId?: string; providerId?: AiProviderId; systemPrompt?: string },
  ): Promise<string> {
    const system = options?.systemPrompt || 'You are an AI assistant in PeopleOS HR Management System.';
    return this.chat(system, prompt, options);
  }

  /**
   * Universal structured JSON generator. Enforces JSON output, strips markdown backticks,
   * and parses into the required type T.
   */
  async generateJson<T>(
    prompt: string,
    schemaInstruction: string,
    options?: { organizationId?: string; providerId?: AiProviderId },
  ): Promise<T> {
    const systemPrompt = `You are a precision AI module that outputs ONLY valid JSON with no comments, explanation, or wrapping markdown fences.\n${schemaInstruction}`;
    const raw = await this.chat(systemPrompt, prompt, options);

    // Clean any markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Find first { or [ and last } or ]
      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      const start = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket) ? firstBrace : firstBracket;

      const lastBrace = cleaned.lastIndexOf('}');
      const lastBracket = cleaned.lastIndexOf(']');
      const end = Math.max(lastBrace, lastBracket);

      if (start !== -1 && end !== -1 && end > start) {
        const sub = cleaned.substring(start, end + 1);
        return JSON.parse(sub) as T;
      }
      throw new Error(`Failed to parse AI response as JSON: ${raw.slice(0, 200)}`);
    }
  }
}
