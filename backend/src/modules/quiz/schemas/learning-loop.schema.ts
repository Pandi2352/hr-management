import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type LearningLoopDocument = LearningLoop & Document;
export type PracticeSetDocument = PracticeSet & Document;

/** What the coach has to say about one concept. */
export class ConceptCoaching {
  /** Why this concept matters in the work, not in the abstract. */
  @Prop({ type: String, default: '' })
  whyItMatters: string;

  /** The idea itself, explained from the beginning. */
  @Prop({ type: String, default: '' })
  explanation: string;

  /** The specific way this concept is usually got wrong. */
  @Prop({ type: String, default: '' })
  commonMistake: string;

  /** Things to actually do, not things to read. */
  @Prop({ type: [String], default: [] })
  practiceTips: string[];

  /** Whether a model wrote this, or it was assembled from the quiz itself. */
  @Prop({ type: String, enum: ['AI', 'QUIZ'], default: 'QUIZ' })
  source: 'AI' | 'QUIZ';

  @Prop({ type: Date, default: null })
  generatedAt: Date | null;
}

/** One answer, kept so mastery can be recomputed and explained. */
export class ConceptEventRecord {
  @Prop({ type: Date, default: Date.now })
  at: Date;

  @Prop({ type: Boolean, required: true })
  correct: boolean;

  @Prop({ type: String, enum: ['QUIZ', 'PRACTICE'], default: 'QUIZ' })
  source: 'QUIZ' | 'PRACTICE';
}

/** A concept this person has been measured on. */
export class ConceptProgress {
  @Prop({ type: String, required: true })
  concept: string;

  /** Lower-cased name, so two spellings do not become two concepts. */
  @Prop({ type: String, required: true, index: true })
  conceptKey: string;

  @Prop({ type: Number, default: 0 })
  seen: number;

  @Prop({ type: Number, default: 0 })
  correct: number;

  /** The mastery at the moment this concept was first diagnosed as weak. */
  @Prop({ type: Number, default: 0 })
  baselinePct: number;

  @Prop({ type: ConceptCoaching, default: () => ({}) })
  coaching: ConceptCoaching;

  /**
   * Bounded on write.
   *
   * A history that grows forever would turn one employee's document into the
   * largest thing in the collection, and nothing in the product reads past the
   * last few answers. The tallies above are what mastery is computed from, so
   * trimming the log loses the trend line, never the number.
   */
  @Prop({ type: [ConceptEventRecord], default: [] })
  history: ConceptEventRecord[];

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;
}

/**
 * One person's loop on one quiz.
 *
 * Keyed by employee and quiz rather than by attempt, because the point is what
 * happens *between* attempts: the same document is written by the quiz, read by
 * the coach, written again by practice, and read again to show whether anything
 * improved. An attempt-scoped record could not show that.
 */
@Schema({ timestamps: true, collection: 'quiz_learning_loops' })
export class LearningLoop {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true, index: true })
  quizId: string;

  @Prop({ type: String, default: '' })
  quizTitle: string;

  @Prop({ type: String, default: '' })
  quizCategory: string;

  @Prop({ type: [ConceptProgress], default: [] })
  concepts: ConceptProgress[];

  /** The concepts missed in the most recent quiz attempt, worst first. */
  @Prop({ type: [String], default: [] })
  weakConcepts: string[];

  @Prop({ type: String, default: '' })
  lastAttemptId: string;

  @Prop({ type: Number, default: 0 })
  lastScorePct: number;

  /** The score on the first attempt, so improvement has something to be against. */
  @Prop({ type: Number, default: 0 })
  firstScorePct: number;

  @Prop({ type: Number, default: 0 })
  attemptCount: number;

  @Prop({ type: Number, default: 0 })
  practiceCount: number;

  @Prop({ type: Date, default: null })
  lastPracticedAt: Date | null;
}

export const LearningLoopSchema = SchemaFactory.createForClass(LearningLoop);
LearningLoopSchema.index({ organizationId: 1, employeeId: 1, quizId: 1 }, { unique: true });
LearningLoopSchema.index({ organizationId: 1, employeeId: 1 });

/** A question in a targeted retry. */
export class PracticeQuestion {
  @Prop({ type: String, required: true })
  prompt: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ type: Number, required: true })
  correctOptionIndex: number;

  @Prop({ type: String, default: '' })
  explanation: string;

  /** The weak concept this question is here to test. */
  @Prop({ type: String, required: true })
  concept: string;

  /** Where it came from: the original quiz, the bank, or written for this set. */
  @Prop({ type: String, enum: ['QUIZ', 'BANK', 'AI'], default: 'QUIZ' })
  origin: 'QUIZ' | 'BANK' | 'AI';
}

/**
 * A targeted retry.
 *
 * Stored rather than generated on the fly at grade time, because the options
 * are shuffled when the set is built: without a stored copy, grading would have
 * no way to know which option the person was actually looking at when they
 * clicked position two.
 */
@Schema({ timestamps: true, collection: 'quiz_practice_sets' })
export class PracticeSet {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true, index: true })
  quizId: string;

  @Prop({ type: String, default: '' })
  quizTitle: string;

  @Prop({ type: [String], default: [] })
  concepts: string[];

  @Prop({ type: [PracticeQuestion], default: [] })
  questions: PracticeQuestion[];

  @Prop({ type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN', index: true })
  status: 'OPEN' | 'COMPLETED';

  @Prop({ type: Number, default: 0 })
  scorePct: number;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export const PracticeSetSchema = SchemaFactory.createForClass(PracticeSet);
PracticeSetSchema.index({ organizationId: 1, employeeId: 1, quizId: 1, status: 1 });
