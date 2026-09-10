/**
 * Ollama cloud models the free credits cover.
 *
 * A fixed list rather than a live fetch of `/api/tags`: that endpoint returns
 * the full hosted catalogue, most of which the free tier will refuse, so
 * offering it as a dropdown would mostly be offering models that fail on first
 * use. This list is the set a new key can actually run.
 *
 * It is a suggestion, not a restriction. The model field accepts anything, so
 * a paid key can name a model that is not here.
 */
export interface OllamaModelOption {
  /** The exact string sent as `model`. */
  id: string;
  label: string;
  /** One line on what it is for, shown under the option. */
  note: string;
}

export const OLLAMA_FREE_CLOUD_MODELS: OllamaModelOption[] = [
  { id: 'gpt-oss:120b', label: 'GPT-OSS 120B', note: 'Largest general model. Best judgement, slowest.' },
  { id: 'gpt-oss:20b', label: 'GPT-OSS 20B', note: 'Same family, noticeably faster.' },
  { id: 'gemma4:31b', label: 'Gemma 4 31B', note: 'Strong all-rounder, good at following a format.' },
  { id: 'nemotron-3-ultra', label: 'Nemotron 3 Ultra', note: 'Reasoning-heavy work.' },
  { id: 'nemotron-3-super', label: 'Nemotron 3 Super', note: 'Balanced quality and speed.' },
  { id: 'nemotron-3-nano:30b', label: 'Nemotron 3 Nano 30B', note: 'Quickest of the set.' },
];

/** Default when nothing is configured. The most capable of the free models. */
export const OLLAMA_DEFAULT_MODEL = 'gpt-oss:120b';
