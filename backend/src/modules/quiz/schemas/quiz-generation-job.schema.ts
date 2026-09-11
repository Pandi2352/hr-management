import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type QuizGenerationJobDocument = QuizGenerationJob & Document;

export const JOB_STATUSES = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** A job is finished, one way or another, in these states. */
export const TERMINAL_JOB_STATUSES: JobStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

/**
 * A quiz being written in the background.
 *
 * Fifty questions is several minutes of model time, and nobody should have to
 * sit on one screen watching it. The job is a durable record rather than a
 * promise held in memory: the browser can navigate away, the tab can close, and
 * the work continues — and when the person comes back, the progress is still
 * there to be read.
 *
 * Live progress is mirrored into the cache because it is written every few
 * seconds and polled every few seconds. Mongo remains the source of truth, so
 * a flushed cache or a restarted process costs a poll, never the job.
 */
@Schema({ timestamps: true, collection: 'quiz_generation_jobs' })
export class QuizGenerationJob {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  /** The user who asked for it. Only they are shown its progress. */
  @Prop({ type: String, required: true, index: true })
  requestedByUserId: string;

  @Prop({ type: String, default: '' })
  requestedByName: string;

  @Prop({ type: String, enum: JOB_STATUSES, default: 'QUEUED', index: true })
  status: JobStatus;

  @Prop({ type: String, required: true })
  topic: string;

  /** Everything the studio chose, kept so the job can be repeated or explained. */
  @Prop({ type: Object, default: {} })
  params: Record<string, any>;

  @Prop({ type: Number, default: 0 })
  questionsDone: number;

  @Prop({ type: Number, required: true })
  questionsTotal: number;

  /** The questions written so far. A cancelled job still keeps what it made. */
  @Prop({ type: [Object], default: [] })
  questions: Record<string, any>[];

  /** Set when the job finishes and the draft has been saved. */
  @Prop({ type: String, default: '' })
  quizId: string;

  @Prop({ type: String, default: '' })
  quizTitle: string;

  /**
   * Why it failed, in words the person who asked can act on.
   *
   * Never a stack trace: this string is shown in a notification.
   */
  @Prop({ type: String, default: '' })
  error: string;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null })
  finishedAt: Date | null;
}

export const QuizGenerationJobSchema = SchemaFactory.createForClass(QuizGenerationJob);
QuizGenerationJobSchema.index({ organizationId: 1, requestedByUserId: 1, status: 1 });
QuizGenerationJobSchema.index({ organizationId: 1, createdAt: -1 });
