import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type AiProviderSettingDocument = AiProviderSetting & Document;

/**
 * Per-organization overrides for one AI provider, entered through the UI.
 *
 * Environment variables stay the fallback. They are right for a deployment that
 * configures itself from a secret manager, and wrong for an administrator who
 * wants to paste a key without a redeploy — so the two layer: a row here wins,
 * and its absence means "use whatever the environment says".
 *
 * The key is stored encrypted, never hashed: the server has to replay it on
 * every outbound call. `apiKeyMasked` exists so the settings page can show
 * *which* key is stored without the plaintext ever leaving the server.
 */
@Schema({ timestamps: true, collection: 'ai_provider_settings' })
export class AiProviderSetting {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  /** `openai` | `ollama` | `opencode`. Not an enum, so a new provider needs no migration. */
  @Prop({ type: String, required: true })
  providerId: string;

  /**
   * AES-256-GCM ciphertext from `sealSecret`. Never selected into any response.
   * An empty string means "no key here, fall back to the environment".
   */
  @Prop({ type: String, default: '' })
  apiKeyCipher: string;

  /** `••••abcd`. Safe to return; enough to recognise the key, useless to steal. */
  @Prop({ type: String, default: '' })
  apiKeyMasked: string;

  /** Overrides the provider's model. Empty means the environment default. */
  @Prop({ type: String, default: '' })
  model: string;

  /** Overrides the provider's host or base URL. Empty means the environment default. */
  @Prop({ type: String, default: '' })
  host: string;

  /** An explicit off switch that survives a valid key being present. */
  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  /** Designated as primary default provider for the organization */
  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  @Prop({ type: String, default: '' })
  updatedByUserId: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AiProviderSettingSchema = SchemaFactory.createForClass(AiProviderSetting);

/** One row per provider per organization; the upsert relies on this. */
AiProviderSettingSchema.index({ organizationId: 1, providerId: 1 }, { unique: true });
