import type { AiProviderId } from '../types/ai.types';
import chatgptLogo from '../../../assets/ai-logos/chatgpt-logo_svgstack_com_36931789038400.png';
import ollamaLogo from '../../../assets/ai-logos/Ollama Icon - Light - zonalogo.com.png';
import groqLogo from '../../../assets/ai-logos/grok-ai-logo_svgstack_com_37221789039787.png';
import claudeLogo from '../../../assets/ai-logos/claude-logo_svgstack_com_36971789040384.png';
import geminiLogo from '../../../assets/ai-logos/gemini-logo_svgstack_com_37141789040360.png';

interface Props {
  providerId: AiProviderId;
  className?: string;
}

export function ProviderIcon({ providerId, className = 'h-4 w-4' }: Props) {
  if (providerId === 'openai') {
    return (
      <img
        src={chatgptLogo}
        alt="OpenAI"
        className={`${className} object-contain shrink-0`}
      />
    );
  }

  if (providerId === 'ollama') {
    return (
      <img
        src={ollamaLogo}
        alt="Ollama"
        className={`${className} object-contain shrink-0`}
      />
    );
  }

  if (providerId === 'groq') {
    return (
      <img
        src={groqLogo}
        alt="Groq"
        className={`${className} object-contain shrink-0`}
      />
    );
  }

  if (providerId === 'anthropic') {
    return (
      <img
        src={claudeLogo}
        alt="Claude (Anthropic)"
        className={`${className} object-contain shrink-0`}
      />
    );
  }

  if (providerId === 'gemini') {
    return (
      <img
        src={geminiLogo}
        alt="Google Gemini"
        className={`${className} object-contain shrink-0`}
      />
    );
  }

  if (providerId === 'opencode') {
    return (
      <span className={`${className} flex items-center justify-center font-bold text-[11px] tracking-wide text-purple-700 dark:text-purple-300 bg-purple-500/10 rounded-md select-none`}>
        OC
      </span>
    );
  }

  return null;
}
