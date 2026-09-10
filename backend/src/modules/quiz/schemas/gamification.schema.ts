import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type EmployeeGamificationDocument = EmployeeGamification & Document;

@Schema({ timestamps: true, collection: 'employee_gamification' })
export class EmployeeGamification {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  employeeId: string;

  // Denormalized for fast leaderboard rendering
  @Prop({ type: String, default: '' })
  displayName: string;

  @Prop({ type: String, default: '' })
  avatarUrl: string;

  @Prop({ type: String, default: '' })
  departmentId: string;

  @Prop({ type: String, default: '' })
  departmentName: string;

  @Prop({ type: String, default: '' })
  designationTitle: string;

  @Prop({ type: Number, default: 0, index: true })
  totalXp: number;

  @Prop({ type: Number, default: 1 })
  level: number;

  @Prop({ type: Number, default: 0 })
  quizzesCompleted: number;

  @Prop({ type: Number, default: 0 })
  perfectScores: number;

  @Prop({ type: Number, default: 0 })
  currentStreak: number;

  @Prop({ type: [String], default: [] })
  badges: string[];

  @Prop({ type: Date })
  lastQuizDate?: Date;
}

export const EmployeeGamificationSchema = SchemaFactory.createForClass(EmployeeGamification);
EmployeeGamificationSchema.index({ organizationId: 1, totalXp: -1 });
EmployeeGamificationSchema.index({ organizationId: 1, departmentId: 1, totalXp: -1 });
