import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type QuizAttemptDocument = QuizAttempt & Document;

export class SelectedAnswer {
  @Prop({ type: Number, required: true })
  questionIndex: number;

  @Prop({ type: Number, required: true })
  selectedOptionIndex: number;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;

  @Prop({ type: Number, default: 0 })
  pointsAwarded: number;
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
}

export const QuizAttemptSchema = SchemaFactory.createForClass(QuizAttempt);
QuizAttemptSchema.index({ organizationId: 1, employeeId: 1 });
QuizAttemptSchema.index({ organizationId: 1, quizId: 1, employeeId: 1 });
