import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AiProviderSetting,
  AiProviderSettingDocument,
} from './schemas/ai-provider-setting.schema';
import { canEncryptSecrets, maskSecret, openSecretOrNull, sealSecret } from '../../common/crypto/secret-box';
import { LoggerHelper } from '../../common/logger';
import type { AiProviderId } from './config/ai.config';

/** What a provider needs, after the database row and the environment are merged. */
export interface ResolvedProviderSettings {
  apiKey: string;
  model: string;
  host: string;
  /** False only when an administrator switched this provider off in the UI. */
  enabled: boolean;
  /** True when the values came from a saved row rather than the environment. */
  fromDatabase: boolean;
  /** `••••abcd`, or empty. Safe to return to a client. */
  apiKeyMasked: string;
}

export interface SaveProviderSettingsInput {
  /** Omit to leave the stored key alone; empty string to clear it. */
  apiKey?: string;
  model?: string;
  host?: string;
  enabled?: boolean;
}

/**
 * Reads and writes UI-entered provider credentials.
 *
 * Sits between the providers and their configuration so a provider never has to
 * know whether a value came from the environment or from someone typing it into
 * the settings page. The rule is one line: a saved value wins, an unset one
 * falls through to the environment.
 *
 * Nothing here ever returns a plaintext key to a caller that is not a provider
 * about to use it. The settings page gets `apiKeyMasked` and a boolean.
 */
@Injectable()
export class AiSettingsService {
  private readonly logger = LoggerHelper.Instance.child(AiSettingsService.name);

  constructor(
    @InjectModel(AiProviderSetting.name)
    private readonly settingModel: Model<AiProviderSettingDocument>,
  ) {}

  /** False when the deployment has no secret to encrypt with, so the UI can say so. */
  canStoreKeys(): boolean {
    return canEncryptSecrets();
  }

  /**
   * Merges the saved row over the environment defaults.
   *
   * Called on every provider request rather than cached, so a key saved in the
   * UI works on the next call instead of after a restart. It is one indexed
   * read against a collection with a handful of rows.
   */
  async resolve(
    organizationId: string,
    providerId: AiProviderId,
    envDefaults: { apiKey: string; model: string; host: string },
  ): Promise<ResolvedProviderSettings> {
    const row = await this.settingModel
      .findOne({ organizationId, providerId })
      .lean()
      .catch(() => null);

    if (!row) {
      return {
        ...envDefaults,
        enabled: true,
        fromDatabase: false,
        apiKeyMasked: envDefaults.apiKey ? maskSecret(envDefaults.apiKey) : '',
      };
    }

    /*
     * A key that will not decrypt falls back to the environment rather than
     * failing the request. That happens when the encryption secret was rotated,
     * and leaving the provider merely unconfigured is recoverable — the
     * operator pastes the key again — where a 500 on the settings page is not.
     */
    const stored = openSecretOrNull(row.apiKeyCipher);
    if (row.apiKeyCipher && !stored) {
      this.logger.warn(null, 'Stored AI credential could not be decrypted; falling back to environment', {
        providerId,
        organizationId,
      });
    }

    const apiKey = stored || envDefaults.apiKey;

    return {
      apiKey,
      model: row.model || envDefaults.model,
      host: row.host || envDefaults.host,
      enabled: row.enabled !== false,
      fromDatabase: true,
      apiKeyMasked: stored ? row.apiKeyMasked || maskSecret(stored) : apiKey ? maskSecret(apiKey) : '',
    };
  }

  /**
   * Saves what an administrator typed.
   *
   * `apiKey` is three-state on purpose. Undefined leaves the stored key alone,
   * so saving a model change does not require re-typing the credential. An
   * empty string clears it, which is how the UI removes a key. Anything else
   * replaces it.
   */
  async save(
    organizationId: string,
    providerId: AiProviderId,
    input: SaveProviderSettingsInput,
    actorUserId: string,
  ): Promise<ResolvedProviderSettings> {
    const update: Record<string, unknown> = { updatedByUserId: actorUserId };

    if (input.apiKey !== undefined) {
      const trimmed = input.apiKey.trim();
      if (trimmed) {
        if (!this.canStoreKeys()) {
          throw new BadRequestException(
            'This server cannot store credentials: set CREDENTIALS_SECRET (32+ characters) and restart.',
          );
        }
        update.apiKeyCipher = sealSecret(trimmed);
        update.apiKeyMasked = maskSecret(trimmed);
      } else {
        update.apiKeyCipher = '';
        update.apiKeyMasked = '';
      }
    }

    if (input.model !== undefined) update.model = input.model.trim();
    if (input.host !== undefined) update.host = input.host.trim().replace(/\/+$/, '');
    if (input.enabled !== undefined) update.enabled = input.enabled;

    await this.settingModel.updateOne(
      { organizationId, providerId },
      { $set: update, $setOnInsert: { organizationId, providerId } },
      { upsert: true },
    );

    this.logger.info(null, 'AI provider settings saved', {
      providerId,
      organizationId,
      // Deliberately records *that* the key changed, never the key.
      keyChanged: input.apiKey !== undefined,
      model: update.model,
    });

    return this.resolve(organizationId, providerId, { apiKey: '', model: '', host: '' });
  }

  /** Removes every override for a provider, returning it to the environment. */
  async clear(organizationId: string, providerId: AiProviderId): Promise<void> {
    await this.settingModel.deleteOne({ organizationId, providerId });
    this.logger.info(null, 'AI provider settings cleared', { providerId, organizationId });
  }
}
