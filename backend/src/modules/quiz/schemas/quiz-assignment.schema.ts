import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type QuizAssignmentDocument = QuizAssignment & Document;

@Schema({ timestamps: true, collection: 'quiz_assignments' })
export class QuizAssignment {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  quizId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, default: '' })
  assignedBy: string;

  @Prop({ type: Boolean, default: false })
  isAllEmployees: boolean;

  @Prop({ type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'], default: 'PENDING', index: true })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number, default: 0 })
  score?: number;

  @Prop({ type: Number, default: 0 })
  scorePct?: number;

  @Prop({ type: Boolean, default: false })
  passed?: boolean;
}

export const QuizAssignmentSchema = SchemaFactory.createForClass(QuizAssignment);
QuizAssignmentSchema.index({ organizationId: 1, employeeId: 1, status: 1 });
QuizAssignmentSchema.index({ organizationId: 1, quizId: 1, employeeId: 1 }, { unique: true });
