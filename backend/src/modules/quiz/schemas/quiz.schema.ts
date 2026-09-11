import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type QuizDocument = Quiz & Document;

/**
 * A quiz's life from generated to assignable.
 *
 * `DRAFT` is anything the agent produced or a person is still editing.
 * `IN_REVIEW` is waiting for a second pair of eyes. `APPROVED` has had them,
 * and is the first state that may be assigned to a real employee. `PUBLISHED`
 * is approved and visible in the arena; `ARCHIVED` is retired without losing
 * the attempts already recorded against it.
 *
 * The gate exists because a generated quiz can be confidently wrong. An
 * unreviewed answer key does not merely fail one person — it teaches the whole
 * company the wrong thing and then reports them as having learned it.
 */
export const QUIZ_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] as const;
export type QuizStatus = (typeof QUIZ_STATUSES)[number];

/** The statuses from which a quiz may be assigned to employees. */
export const ASSIGNABLE_STATUSES: QuizStatus[] = ['APPROVED', 'PUBLISHED'];

/** Which attempt counts when someone is allowed more than one. */
export const SCORING_MODES = ['BEST', 'LATEST'] as const;
export type ScoringMode = (typeof SCORING_MODES)[number];

/**
 * Languages a quiz can be generated in.
 *
 * A fixed list rather than free text: the value steers a generation prompt and
 * labels the quiz in the arena, and an unrecognised locale would silently
 * produce English while claiming otherwise.
 */
export const QUIZ_LOCALES = ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'mr', 'bn'] as const;
export type QuizLocale = (typeof QUIZ_LOCALES)[number];

export const QUIZ_LOCALE_LABELS: Record<QuizLocale, string> = {
  en: 'English',
  ta: 'தமிழ் (Tamil)',
  hi: 'हिन्दी (Hindi)',
  te: 'తెలుగు (Telugu)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)',
  mr: 'मराठी (Marathi)',
  bn: 'বাংলা (Bengali)',
};

export class QuizQuestion {
  @Prop({ type: String, default: generateUuid })
  id: string;

  @Prop({ type: String, required: true, trim: true })
  prompt: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ type: Number, required: true })
  correctOptionIndex: number;

  @Prop({ type: String, default: '' })
  explanation: string;

  @Prop({ type: Number, default: 10 })
  points: number;

  /**
   * Free-form labels on the question itself: topic, skill, policy, role.
   * Separate from the quiz's own tags so a question can be reused in the bank
   * under its own terms rather than inheriting whichever quiz it came from.
   */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /** Which section of the blueprint this question belongs to, when there are sections. */
  @Prop({ type: String, default: '' })
  section: string;

  /**
   * Where the answer comes from, when generation was grounded in a document.
   * Shown with the explanation so a disputed answer can be checked rather than
   * argued about.
   */
  @Prop({ type: String, default: '' })
  sourceEvidence: string;

  /** Set once a reviewer has accepted this specific question. */
  @Prop({ type: Boolean, default: false })
  isApproved: boolean;
}

/** One part of a blueprint: how many questions, at what difficulty. */
export class QuizSection {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  questionCount: number;

  @Prop({ type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'INTERMEDIATE' })
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

/** How many times someone may sit a quiz, and which attempt counts. */
export class AttemptPolicy {
  /** 0 means unlimited. */
  @Prop({ type: Number, default: 1, min: 0, max: 20 })
  maxAttempts: number;

  @Prop({ type: String, enum: SCORING_MODES, default: 'BEST' })
  scoring: ScoringMode;

  /** True when the assignment is not complete until the pass mark is reached. */
  @Prop({ type: Boolean, default: false })
  mustPass: boolean;

  /** Hours before a failed attempt may be retried. 0 means immediately. */
  @Prop({ type: Number, default: 0, min: 0, max: 720 })
  cooldownHours: number;
}

@Schema({ timestamps: true, collection: 'quizzes' })
export class Quiz {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, default: '', trim: true })
  description: string;

  @Prop({ type: String, default: 'General' })
  category: string;

  /** Quiz-level labels: department, policy, role, skill. */
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'INTERMEDIATE' })
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @Prop({ type: String, enum: QUIZ_LOCALES, default: 'en' })
  locale: QuizLocale;

  /** Populated when a quiz was started from a template. */
  @Prop({ type: String, default: '' })
  templateId: string;

  @Prop({ type: [QuizSection], default: [] })
  sections: QuizSection[];

  @Prop({ type: Number, default: 15 })
  timeLimitMinutes: number;

  @Prop({ type: Number, default: 70 })
  passingScorePct: number;

  @Prop({ type: Number, default: 100 })
  xpReward: number;

  /*
   * Spelled out rather than `default: () => ({})`.
   *
   * An empty object relies on the nested props filling themselves in, which
   * they did not: the field came back undefined and every policy check fell
   * through to its inline fallback. A policy that silently does not exist is
   * worse than no feature, because the UI shows one.
   */
  @Prop({
    type: AttemptPolicy,
    default: () => ({ maxAttempts: 1, scoring: 'BEST', mustPass: false, cooldownHours: 0 }),
  })
  attemptPolicy: AttemptPolicy;

  /** Randomise option order per attempt, so neighbours do not see the same sheet. */
  @Prop({ type: Boolean, default: true })
  shuffleOptions: boolean;

  @Prop({ type: Boolean, default: false })
  shuffleQuestions: boolean;

  @Prop({ type: [QuizQuestion], default: [] })
  questions: QuizQuestion[];

  @Prop({ type: String, default: '' })
  createdBy: string;

  @Prop({ type: String, default: '' })
  createdByName: string;

  @Prop({ type: Boolean, default: false })
  isAiGenerated: boolean;

  @Prop({ type: String, enum: QUIZ_STATUSES, default: 'DRAFT', index: true })
  status: QuizStatus;

  // --- Review trail --------------------------------------------------------

  @Prop({ type: String, default: '' })
  approvedBy: string;

  @Prop({ type: String, default: '' })
  approvedByName: string;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;

  /** Why a reviewer sent it back, so the author knows what to fix. */
  @Prop({ type: String, default: '' })
  reviewNote: string;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
QuizSchema.index({ organizationId: 1, status: 1 });
QuizSchema.index({ organizationId: 1, category: 1 });
QuizSchema.index({ organizationId: 1, tags: 1 });
