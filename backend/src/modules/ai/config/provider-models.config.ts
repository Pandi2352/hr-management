import type { AiProviderId } from './ai.config';

export interface ModelOption {
  id: string;
  label: string;
  note: string;
}

export const PROVIDER_MODELS: Record<AiProviderId, ModelOption[]> = {
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', note: 'Flagship omnimodel, smart & high quality' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', note: 'Fast, lightweight & highly economical' },
    { id: 'o3-mini', label: 'o3-mini', note: 'High-speed STEM, coding & logic reasoning' },
    { id: 'o1', label: 'o1', note: 'Advanced full reasoning & deep problem solving' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', note: 'Legacy high-capability model' },
  ],
  anthropic: [
    { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet', note: 'Hybrid fast/thinking reasoning model' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', note: 'Best-in-class coding & HR analysis' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', note: 'Ultra-fast, responsive & lightweight' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'Next-gen multimodal, fast & smart' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', note: 'Advanced complex reasoning model' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', note: '2M token deep context window' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', note: 'Fast, high-throughput model' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', note: '300+ tok/s high-speed enterprise reasoning' },
    { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek-R1 Distill 70B', note: 'Reasoning model on Groq LPU' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', note: 'Instant sub-second inference' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B MoE', note: '32k context mixture of experts' },
  ],
  ollama: [
    { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B', note: 'Multilingual & reasoning on Ollama' },
    { id: 'llama3.2:3b', label: 'Llama 3.2 3B', note: 'Lightweight local inference' },
    { id: 'deepseek-r1:7b', label: 'DeepSeek-R1 7B', note: 'Reasoning model on local device' },
    { id: 'mistral:7b', label: 'Mistral 7B', note: 'Strong general local model' },
  ],
  opencode: [
    { id: 'default', label: 'Default', note: 'Local OpenCode runtime engine' },
    { id: 'custom', label: 'Custom', note: 'Self-hosted model endpoint' },
  ],
};

export const PROVIDER_DEFAULTS: Record<AiProviderId, { host: string; model: string; hint: string }> = {
  openai: {
    host: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: 'OpenAI official API (sk-...). Enter your API key to activate ChatGPT capabilities.',
  },
  anthropic: {
    host: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    hint: 'Anthropic Claude API (sk-ant-...). Native v1 messages API for high-precision reasoning.',
  },
  gemini: {
    host: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    hint: 'Google AI Studio API key (AIzaSy...). Speaks OpenAI-compatible format with Gemini models.',
  },
  groq: {
    host: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    hint: 'Groq LPU ultra-fast API (gsk_...). Delivers blazing fast response times.',
  },
  ollama: {
    host: 'http://localhost:11434',
    model: 'qwen2.5:7b',
    hint: 'Ollama local server or remote instance. Connect without API key for local instances.',
  },
  opencode: {
    host: 'http://localhost:4096',
    model: 'default',
    hint: 'OpenCode interpreter server or any custom OpenAI-compatible proxy.',
  },
};
