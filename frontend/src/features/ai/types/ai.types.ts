export type AiProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama' | 'opencode';

export interface AiModelOption {
  id: string;
  label: string;
  note: string;
}

export interface AiProviderStatus {
  id: AiProviderId;
  displayName: string;
  configured: boolean;
  model: string;
  isDefault: boolean;
  hint: string;
  /** True when the key can be entered on this page rather than in the environment. */
  supportsUiConfig: boolean;
  /** Masked form only. The key itself never reaches the browser. */
  apiKeyMasked: string;
  hasApiKey: boolean;
  /** Where the active settings came from. */
  source: 'database' | 'environment';
  host: string;
  /** Suggested models for the dropdown. Empty when the provider has no list. */
  models: AiModelOption[];
}

export interface AiProvidersState {
  enabled: boolean;
  /** False when the server has no encryption secret, so keys cannot be stored. */
  canStoreKeys: boolean;
  providers: AiProviderStatus[];
}

export interface SaveProviderSettingsPayload {
  /** Omit to keep the stored key; empty string to clear it. */
  apiKey?: string;
  model?: string;
  host?: string;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface TestPromptResponse {
  reply: string;
  latencyMs: number;
  modelUsed: string;
}
