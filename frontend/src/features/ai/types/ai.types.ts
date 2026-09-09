export type AiProviderId = 'openai' | 'opencode';

export interface AiProviderStatus {
  id: AiProviderId;
  displayName: string;
  configured: boolean;
  model: string;
  isDefault: boolean;
  hint: string;
}

export interface AiProvidersState {
  enabled: boolean;
  providers: AiProviderStatus[];
}

export type AiRecommendation = 'SHORTLIST' | 'MAYBE' | 'REJECT';

export interface AiScore {
  aiScore?: number | null;
  aiRecommendation?: AiRecommendation | null;
  aiSummary?: string;
  aiStrengths?: string[];
  aiGaps?: string[];
  aiProvider?: string | null;
  aiScoredAt?: string | null;
}

export const AI_RECOMMENDATION_META: Record<AiRecommendation, { label: string; classes: string }> = {
  SHORTLIST: {
    label: 'Shortlist',
    classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  MAYBE: {
    label: 'Maybe',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  REJECT: {
    label: 'Reject',
    classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
};
