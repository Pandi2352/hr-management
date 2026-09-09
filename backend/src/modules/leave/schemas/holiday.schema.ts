import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type HolidayDocument = Holiday & Document;

@Schema({ timestamps: true, collection: 'holidays' })
export class Holiday {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  name: string;

  /** Calendar date as `YYYY-MM-DD` (lexically sortable, timezone-safe). */
  @Prop({ required: true, index: true })
  date: string;

  @Prop({ type: Number, required: true, index: true })
  year: number;

  @Prop({ type: String, enum: ['FIXED', 'RESTRICTED'], default: 'FIXED', index: true })
  type: 'FIXED' | 'RESTRICTED';

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const HolidaySchema = SchemaFactory.createForClass(Holiday);
HolidaySchema.index({ organizationId: 1, year: 1, type: 1 });
HolidaySchema.index({ organizationId: 1, date: 1, name: 1 }, { unique: true });
