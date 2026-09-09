import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type ShiftDocument = Shift & Document;

/**
 * Named work schedule. Times are `HH:mm` 24h; an end earlier than (or equal
 * to) the start means an overnight shift. Grace minutes forgive small late
 * arrivals / early exits before flagging.
 */
@Schema({ timestamps: true, collection: 'shifts' })
export class Shift {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ type: Number, default: 15, min: 0 })
  graceMinutes: number;

  @Prop({ type: Number, default: 0, min: 0 })
  breakMinutes: number;

  @Prop({ type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
ShiftSchema.index({ organizationId: 1, code: 1 }, { unique: true });
