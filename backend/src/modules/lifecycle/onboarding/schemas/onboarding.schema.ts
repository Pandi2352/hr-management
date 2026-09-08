import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../../common/utils/uuid.util';

export type OnboardingDocument = Onboarding & Document;

export class TaskSubmission {
  @Prop({ default: '' })
  textNotes?: string;

  @Prop({ type: [String], default: [] })
  fileUrls?: string[];

  @Prop({ type: Object, default: null })
  payload?: Record<string, any> | null;
}

export class OnboardingTask {
  @Prop({ default: () => generateUuid() })
  id: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({
    required: true,
    enum: ['HR', 'IT', 'MANAGER', 'EMPLOYEE'],
    default: 'HR',
  })
  category: 'HR' | 'IT' | 'MANAGER' | 'EMPLOYEE';

  @Prop({ default: true })
  isMandatory: boolean;

  @Prop({
    default: 'PENDING',
    enum: ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'],
  })
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

  @Prop({ type: String, default: null })
  assignedTo?: string | null;

  @Prop({ default: 0 })
  dueDaysFromJoining: number;

  @Prop({ default: '' })
  dueDate?: string;

  @Prop({ type: TaskSubmission, default: () => ({}) })
  submission?: TaskSubmission;

  @Prop({ default: '' })
  remarks?: string;

  @Prop({ type: Date, default: null })
  completedAt?: Date | null;

  @Prop({ type: String, default: null })
  completedBy?: string | null;
}

@Schema({ timestamps: true, collection: 'onboardings' })
export class Onboarding {
  @Prop({ type: String, default: () => generateUuid() })
  _id: string;

  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  employeeId: string;

  @Prop({ required: true })
  targetJoiningDate: string;

  @Prop({
    default: 'IN_PROGRESS',
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'],
    index: true,
  })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

  @Prop({ default: 0 })
  overallProgress: number; // 0 to 100

  @Prop({ default: 0 })
  completedTasks: number;

  @Prop({ default: 0 })
  totalTasks: number;

  @Prop({ type: [OnboardingTask], default: [] })
  tasks: OnboardingTask[];

  @Prop({ type: Date, default: null })
  completedAt?: Date | null;

  @Prop({ type: String, default: null })
  completedBy?: string | null;
}

export const OnboardingSchema = SchemaFactory.createForClass(Onboarding);

// Ensure index on organizationId + employeeId
OnboardingSchema.index({ organizationId: 1, employeeId: 1 });
OnboardingSchema.index({ organizationId: 1, status: 1 });
