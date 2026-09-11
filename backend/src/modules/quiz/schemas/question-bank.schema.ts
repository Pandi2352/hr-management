import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type BankQuestionDocument = BankQuestion & Document;

/**
 * A question that has been reviewed and kept.
 *
 * Separate from the questions embedded in a quiz, because the two have
 * different lifetimes. A quiz's questions are a snapshot: editing the bank must
 * not silently change a quiz people have already sat, or their stored answers
 * would stop matching what they were asked.
 *
 * So a bank entry is copied *into* a quiz, never referenced by it. The link
 * back is `sourceQuizId`, kept only so a good question can be traced to where
 * it was first written.
 */
@Schema({ timestamps: true, collection: 'quiz_question_bank' })
export class BankQuestion {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

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

  @Prop({ type: String, default: 'General', index: true })
  category: string;

  @Prop({ type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'INTERMEDIATE' })
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  /** Topic, skill, department, policy, role — whatever makes it findable later. */
  @Prop({ type: [String], default: [], index: true })
  tags: string[];

  @Prop({ type: String, default: 'en' })
  locale: string;

  @Prop({ type: String, default: '' })
  sourceEvidence: string;

  /** The quiz this was first written for. Provenance only; not a live link. */
  @Prop({ type: String, default: '' })
  sourceQuizId: string;

  @Prop({ type: String, default: '' })
  createdBy: string;

  @Prop({ type: String, default: '' })
  createdByName: string;

  /** How many times it has been pulled into a quiz. Surfaces what actually works. */
  @Prop({ type: Number, default: 0 })
  usageCount: number;
}

export const BankQuestionSchema = SchemaFactory.createForClass(BankQuestion);
BankQuestionSchema.index({ organizationId: 1, category: 1, difficulty: 1 });
BankQuestionSchema.index({ organizationId: 1, tags: 1 });

/**
 * Prevents the same question being banked twice.
 *
 * Keyed on the prompt rather than the whole question: two entries with the same
 * wording and different options are almost always a duplicate someone edited,
 * not two distinct questions.
 */
BankQuestionSchema.index({ organizationId: 1, prompt: 1 }, { unique: true });
