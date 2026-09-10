import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { LoggerHelper } from '../../common/logger';
import { aiConfig, AI_PROVIDER_IDS, type AiModuleConfig, type AiProviderId } from './config/ai.config';
import { OpenAiProvider } from './providers/openai.provider';
import { OpencodeProvider } from './providers/opencode.provider';
import { OllamaProvider } from './providers/ollama.provider';
import type { AiProvider, ProviderOverride } from './providers/ai-provider.interface';
import { AiSettingsService } from './ai-settings.service';
import { OLLAMA_FREE_CLOUD_MODELS } from './config/ollama.models';

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
  /** Suggested models for the dropdown. Empty when the provider has no list. */
  models: { id: string; label: string; note: string }[];
}

/** Providers whose credentials can be typed into the settings page. */
const UI_CONFIGURABLE: AiProviderId[] = ['ollama'];

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
   *
   * Async because the UI-configurable providers read their saved credentials
   * per organization. The masked key is the only form that leaves the server.
   */
  async listProviders(organizationId: string): Promise<ProviderStatus[]> {
    // Ordered by the shared id list rather than object key order, so the page
    // does not reshuffle when a provider is added.
    return Promise.all(
      AI_PROVIDER_IDS.filter((id) => this.providers[id]).map(async (id) => {
        const provider = this.providers[id];
        const uiConfigurable = UI_CONFIGURABLE.includes(id);
        const override = uiConfigurable ? await this.overrideFor(organizationId, id) : undefined;

        return {
          id,
          displayName: provider.displayName,
          configured: this.isEnabled() && provider.isConfigured(override),
          model: provider.modelLabel(override),
          isDefault: this.moduleCfg.defaultProvider === id,
          hint: this.hintFor(id, override),
          supportsUiConfig: uiConfigurable,
          apiKeyMasked: override?.apiKeyMasked || '',
          hasApiKey: Boolean(override?.apiKey),
          source: (override?.fromDatabase ? 'database' : 'environment') as 'database' | 'environment',
          host: override?.host || '',
          models: id === 'ollama' ? OLLAMA_FREE_CLOUD_MODELS : [],
        };
      }),
    );
  }

  /**
   * What an operator has to do to switch a provider on.
   *
   * A provider that can describe its own setup is asked; the older two cannot,
   * so their text lives here until they grow the method.
   */
  private hintFor(id: AiProviderId, override?: ProviderOverride): string {
    const provider = this.providers[id] as AiProvider & {
      configurationHint?: (o?: ProviderOverride) => string;
    };
    if (typeof provider.configurationHint === 'function') return provider.configurationHint(override);
    if (id === 'openai') return 'Set OPENAI_API_KEY to enable.';
    return 'Run the opencode server (default http://localhost:4096).';
  }

  /** Saved settings for one provider, or undefined when it is environment-only. */
  private async overrideFor(
    organizationId: string,
    id: AiProviderId,
  ): Promise<(ProviderOverride & { fromDatabase: boolean; apiKeyMasked: string }) | undefined> {
    if (!UI_CONFIGURABLE.includes(id)) return undefined;
    const resolved = await this.settingsService.resolve(organizationId, id, {
      apiKey: '',
      model: '',
      host: '',
    });
    return {
      apiKey: resolved.apiKey,
      model: resolved.model,
      host: resolved.host,
      enabled: resolved.enabled,
      fromDatabase: resolved.fromDatabase,
      apiKeyMasked: resolved.apiKeyMasked,
    };
  }

  async saveProviderSettings(
    organizationId: string,
    id: AiProviderId,
    input: { apiKey?: string; model?: string; host?: string; enabled?: boolean },
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
      // Records that the credential changed, never the credential.
      after: {
        model: input.model,
        host: input.host,
        enabled: input.enabled,
        keyChanged: input.apiKey !== undefined,
      },
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
   * Live connectivity test for the in-menu Test button. Always resolves —
   * failures are data (`{ok: false}`), never throws (except unknown id or
   * globally disabled AI).
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
   * The provider to use, together with the settings it should run under.
   *
   * Replaces the synchronous picker for callers that have an organization,
   * because a UI-entered credential cannot be read without a round trip. The
   * fallback rule is unchanged: if the requested provider is not configured,
   * the first configured one takes over rather than failing the request.
   */
  async pickProviderWithSettings(
    organizationId: string,
    requested?: AiProviderId,
  ): Promise<{ provider: AiProvider; override?: ProviderOverride }> {
    if (!this.isEnabled()) {
      throw new BadRequestException('AI features are disabled (AI_ENABLED=false).');
    }

    const id = requested || this.moduleCfg.defaultProvider;
    if (!this.providers[id]) throw new BadRequestException(`Unknown AI provider "${id}".`);

    const override = await this.overrideFor(organizationId, id);
    if (this.providers[id].isConfigured(override)) {
      return { provider: this.providers[id], override };
    }

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
}
