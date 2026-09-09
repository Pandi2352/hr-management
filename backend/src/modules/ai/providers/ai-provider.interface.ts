import type { AiProviderId } from '../config/ai.config';

export interface ShortlistInput {
  jobTitle: string;
  department: string;
  location: string;
  overview: string;
  requirements: string[];
  experienceLevel: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  yearsExperience: string;
  earliestStartDate: string;
  coverLetter: string;
}

export type ShortlistRecommendation = 'SHORTLIST' | 'MAYBE' | 'REJECT';

export interface ShortlistResult {
  /** 0–100 fit score. */
  score: number;
  recommendation: ShortlistRecommendation;
  strengths: string[];
  gaps: string[];
  summary: string;
}

export interface AiProvider {
  readonly id: AiProviderId;
  readonly displayName: string;
  /** Credentials/endpoint present (no network call). */
  isConfigured(): boolean;
  /** Model label shown in UI (no secrets). */
  modelLabel(): string;
  shortlist(input: ShortlistInput): Promise<ShortlistResult>;
  /** Live connectivity/model check for the in-menu Test button. */
  test(): Promise<ProviderTestResult>;
  /** Free-form chat for copilots (system + user turns, plain text out). */
  chat(system: string, user: string): Promise<string>;
}

export interface ProviderTestResult {
  ok: boolean;
  latencyMs: number;
  detail: string;
}

/** Clamps raw model JSON into a safe ShortlistResult. */
export function normalizeShortlist(raw: unknown): ShortlistResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = Number(obj.score);
  const score = Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 0;
  const rec = String(obj.recommendation || '').toUpperCase();
  const recommendation: ShortlistRecommendation =
    rec === 'SHORTLIST' || rec === 'MAYBE' || rec === 'REJECT' ? rec : score >= 70 ? 'SHORTLIST' : score >= 45 ? 'MAYBE' : 'REJECT';
  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 6) : [];
  return {
    score,
    recommendation,
    strengths: strList(obj.strengths),
    gaps: strList(obj.gaps),
    summary: String(obj.summary || '').slice(0, 1000),
  };
}

export function shortlistPrompt(input: ShortlistInput): string {
  return [
    'You are an HR screening assistant. Score this job candidate 0-100 and recommend SHORTLIST, MAYBE or REJECT.',
    'Base the score only on the data below. Be strict and specific.',
    '',
    `JOB: ${input.jobTitle} (${input.department}, ${input.location})`,
    `Level: ${input.experienceLevel}`,
    `Overview: ${input.overview}`,
    `Requirements: ${input.requirements.join(' | ') || '—'}`,
    '',
    `CANDIDATE: ${input.candidateName} <${input.candidateEmail}> ${input.candidatePhone}`,
    `Experience: ${input.yearsExperience}`,
    `Earliest start: ${input.earliestStartDate}`,
    `Cover letter: ${input.coverLetter || '—'}`,
  ].join('\n');
}

export const SHORTLIST_JSON_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number', description: 'Fit score from 0 to 100' },
    recommendation: { type: 'string', description: 'One of SHORTLIST, MAYBE, REJECT' },
    strengths: { type: 'array', items: { type: 'string' }, description: 'Matching strengths' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'Gaps or risks' },
    summary: { type: 'string', description: 'Two-sentence screening summary' },
  },
  required: ['score', 'recommendation', 'summary'],
};
