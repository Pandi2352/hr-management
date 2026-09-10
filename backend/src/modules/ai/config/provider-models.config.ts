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
    { id: 'gemma4:31b', label: 'gemma4:31b', note: 'Strong all-rounder, good at structured outputs' },
    { id: 'gpt-oss:120b', label: 'gpt-oss:120b', note: 'Largest general model, highest reasoning capability' },
    { id: 'gpt-oss:20b', label: 'gpt-oss:20b', note: 'Fast & responsive general model' },
    { id: 'nemotron-3-nano:30b', label: 'nemotron-3-nano:30b', note: 'Quickest high-speed model' },
    { id: 'nemotron-3-super', label: 'nemotron-3-super', note: 'Balanced quality and speed' },
    { id: 'nemotron-3-ultra', label: 'nemotron-3-ultra', note: 'Reasoning-heavy and complex tasks' },
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
    model: 'gemma4:31b',
    hint: 'Ollama local server or remote instance. Supports free cloud models and local execution.',
  },
  opencode: {
    host: 'http://localhost:4096',
    model: 'default',
    hint: 'OpenCode interpreter server or any custom OpenAI-compatible proxy.',
  },
};
