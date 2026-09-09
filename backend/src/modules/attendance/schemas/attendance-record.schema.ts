import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type AttendanceRecordDocument = AttendanceRecord & Document;

/**
 * One row per employee per calendar day. Times stored as `HH:mm`
 * (24h) so HR can enter/backdate punches; workMinutes derives on checkout.
 */
@Schema({ timestamps: true, collection: 'attendance-records' })
export class AttendanceRecord {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ required: true, index: true })
  date: string;

  @Prop({ default: '', trim: true })
  checkIn: string;

  @Prop({ default: '', trim: true })
  checkOut: string;

  @Prop({ type: String, enum: ['WEB', 'MANUAL'], default: 'WEB' })
  source: 'WEB' | 'MANUAL';

  /** OPEN until checkout; PRESENT once closed; HALF_DAY if 4h-7.9h. */
  @Prop({ type: String, enum: ['OPEN', 'PRESENT', 'HALF_DAY', 'ABSENT'], default: 'OPEN', index: true })
  status: 'OPEN' | 'PRESENT' | 'HALF_DAY' | 'ABSENT';

  @Prop({ type: Boolean, default: false })
  isHalfDay: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  workMinutes: number;

  @Prop({ type: Boolean, default: false })
  isLate: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  lateMinutes: number;

  @Prop({ type: Boolean, default: false })
  isEarlyExit: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  earlyExitMinutes: number;

  @Prop({ type: Number, default: 0, min: 0 })
  overtimeMinutes: number;

  /** True when times came from an approved regularization. */
  @Prop({ type: Boolean, default: false })
  regularized: boolean;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);
AttendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceRecordSchema.index({ organizationId: 1, date: 1 });
