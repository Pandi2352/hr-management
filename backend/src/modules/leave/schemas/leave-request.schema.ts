import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type LeaveRequestDocument = LeaveRequest & Document;

export class ApprovalStep {
  @Prop({ required: true })
  stage: string;

  @Prop({ type: String, default: null })
  approverId: string | null;

  @Prop({ default: '', trim: true })
  approverName: string;

  @Prop({ type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'], default: 'PENDING' })
  action: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

  @Prop({ default: '', trim: true })
  comments: string;

  @Prop({ type: Date, default: null })
  actedAt: Date | null;
}

const ApprovalStepSchema = SchemaFactory.createForClass(ApprovalStep);

/**
 * Manager → HR approval chain. Balance moves pending → used only on final
 * HR approval; rejections/cancels release the pending hold.
 */
@Schema({ timestamps: true, collection: 'leave-requests' })
export class LeaveRequest {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true, index: true })
  leaveTypeId: string;

  @Prop({ required: true })
  startDate: string;

  @Prop({ required: true })
  endDate: string;

  @Prop({ type: Number, required: true, min: 0.5 })
  totalDays: number;

  @Prop({ type: Boolean, default: false })
  isHalfDay: boolean;

  @Prop({ default: '', trim: true })
  reason: string;

  @Prop({
    type: String,
    enum: ['PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING_MANAGER',
    index: true,
  })
  status: 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @Prop({ type: [ApprovalStepSchema], default: [] })
  steps: ApprovalStep[];

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
LeaveRequestSchema.index({ organizationId: 1, status: 1 });
LeaveRequestSchema.index({ organizationId: 1, employeeId: 1 });
