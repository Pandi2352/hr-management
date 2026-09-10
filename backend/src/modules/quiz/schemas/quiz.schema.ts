import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type QuizDocument = Quiz & Document;

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

  @Prop({ type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'INTERMEDIATE' })
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @Prop({ type: Number, default: 15 })
  timeLimitMinutes: number;

  @Prop({ type: Number, default: 70 })
  passingScorePct: number;

  @Prop({ type: Number, default: 100 })
  xpReward: number;

  @Prop({ type: [QuizQuestion], default: [] })
  questions: QuizQuestion[];

  @Prop({ type: String, default: '' })
  createdBy: string; // User ID of HR or Manager

  @Prop({ type: String, default: '' })
  createdByName: string;

  @Prop({ type: Boolean, default: false })
  isAiGenerated: boolean;

  @Prop({ type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'PUBLISHED' })
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
QuizSchema.index({ organizationId: 1, status: 1 });
QuizSchema.index({ organizationId: 1, category: 1 });
