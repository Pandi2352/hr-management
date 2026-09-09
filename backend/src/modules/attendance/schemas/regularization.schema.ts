import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type RegularizationDocument = Regularization & Document;

/**
 * Missed / wrong punch correction. On approval the day's record is written
 * (or overwritten) with the requested times and recomputed.
 */
@Schema({ timestamps: true, collection: 'attendance-regularizations' })
export class Regularization {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  /** `YYYY-MM-DD` */
  @Prop({ required: true, index: true })
  date: string;

  /** Requested `HH:mm` values (checkout optional for open-ended days). */
  @Prop({ required: true })
  requestedCheckIn: string;

  @Prop({ default: '' })
  requestedCheckOut: string;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING',
    index: true,
  })
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @Prop({ type: String, default: null })
  decidedBy: string | null;

  @Prop({ default: '', trim: true })
  decisionNote: string;

  @Prop({ type: Date, default: null })
  decidedAt: Date | null;

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const RegularizationSchema = SchemaFactory.createForClass(Regularization);
RegularizationSchema.index({ organizationId: 1, employeeId: 1, date: 1 });
