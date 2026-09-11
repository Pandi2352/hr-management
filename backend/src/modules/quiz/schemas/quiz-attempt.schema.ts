import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type QuizAttemptDocument = QuizAttempt & Document;

/**
 * One answer, with the question as it was asked.
 *
 * The prompt, options and key are copied in rather than referenced. A quiz can
 * be edited after somebody has sat it, and without the copy an explanation of
 * their score would show them a question they never saw — which is exactly the
 * situation an explainable score exists to prevent.
 */
export class SelectedAnswer {
  @Prop({ type: Number, required: true })
  questionIndex: number;

  @Prop({ type: Number, required: true })
  selectedOptionIndex: number;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;

  @Prop({ type: Number, default: 0 })
  pointsAwarded: number;

  @Prop({ type: Number, default: 0 })
  pointsPossible: number;

  @Prop({ type: String, default: '' })
  prompt: string;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ type: Number, default: -1 })
  correctOptionIndex: number;

  @Prop({ type: String, default: '' })
  explanation: string;

  /** The concepts this question measured, for the weak-point summary. */
  @Prop({ type: [String], default: [] })
  concepts: string[];
}

@Schema({ timestamps: true, collection: 'quiz_attempts' })
export class QuizAttempt {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  quizId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, default: '' })
  assignmentId: string;

  @Prop({ type: [SelectedAnswer], default: [] })
  answers: SelectedAnswer[];

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, required: true })
  totalPoints: number;

  @Prop({ type: Number, required: true })
  scorePct: number;

  @Prop({ type: Boolean, required: true })
  passed: boolean;

  @Prop({ type: Number, default: 0 })
  timeTakenSeconds: number;

  @Prop({ type: Number, default: 0 })
  xpEarned: number;

  @Prop({ type: [String], default: [] })
  badgesUnlocked: string[];

  @Prop({ type: Date, default: Date.now })
  completedAt: Date;

  // --- The record an explainable score is built from -----------------------

  /**
   * How this attempt was graded.
   *
   * Stored per attempt so a change to the grading rules cannot silently
   * rewrite the meaning of a score somebody already received. A dispute about
   * a result from last quarter is answered with last quarter's rules.
   */
  @Prop({ type: String, default: 'v1' })
  gradingVersion: string;

  /** The pass mark in force when this was sat, not the quiz's current one. */
  @Prop({ type: Number, default: 0 })
  passingScorePct: number;

  @Prop({ type: String, default: '' })
  quizTitle: string;

  /** 1 for a first sitting, 2 for the next, and so on. */
  @Prop({ type: Number, default: 1 })
  attemptNumber: number;

  /** The rules that governed retries at the time. */
  @Prop({ type: Object, default: {} })
  attemptPolicySnapshot: Record<string, unknown>;

  /** True when the timer ran out rather than the person pressing submit. */
  @Prop({ type: Boolean, default: false })
  autoSubmitted: boolean;
}

export const QuizAttemptSchema = SchemaFactory.createForClass(QuizAttempt);
QuizAttemptSchema.index({ organizationId: 1, employeeId: 1 });
QuizAttemptSchema.index({ organizationId: 1, quizId: 1, employeeId: 1 });
