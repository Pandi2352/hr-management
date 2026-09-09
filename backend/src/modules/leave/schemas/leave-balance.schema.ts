import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type LeaveBalanceDocument = LeaveBalance & Document;

/**
 * Yearly leave wallet per employee per leave type.
 * Available = allocated + carriedForward − used − pending.
 */
@Schema({ timestamps: true, collection: 'leave-balances' })
export class LeaveBalance {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true, index: true })
  leaveTypeId: string;

  @Prop({ type: Number, required: true, index: true })
  year: number;

  @Prop({ type: Number, default: 0, min: 0 })
  allocated: number;

  @Prop({ type: Number, default: 0, min: 0 })
  carriedForward: number;

  @Prop({ type: Number, default: 0, min: 0 })
  used: number;

  @Prop({ type: Number, default: 0, min: 0 })
  pending: number;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const LeaveBalanceSchema = SchemaFactory.createForClass(LeaveBalance);
LeaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });
LeaveBalanceSchema.index({ organizationId: 1, year: 1 });
