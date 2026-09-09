import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type LeaveTypeDocument = LeaveType & Document;

@Schema({ timestamps: true, collection: 'leave-types' })
export class LeaveType {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  /** Short code: CL, SL, EL, PL, PATERNITY, MATERNITY, COMP_OFF, LOP … */
  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  description: string;

  /** Fresh allocation granted each year by `seed-year`. */
  @Prop({ type: Number, default: 0, min: 0 })
  defaultAllocation: number;

  @Prop({ type: Boolean, default: true })
  carryForwardAllowed: boolean;

  /** Cap applied to carried days when seeding the next year. */
  @Prop({ type: Number, default: 0, min: 0 })
  maxCarryForward: number;

  @Prop({ type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const LeaveTypeSchema = SchemaFactory.createForClass(LeaveType);
LeaveTypeSchema.index({ organizationId: 1, code: 1 }, { unique: true });
