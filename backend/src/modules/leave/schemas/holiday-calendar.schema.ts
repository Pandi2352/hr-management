import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type HolidayCalendarDocument = HolidayCalendar & Document;

/**
 * Per-year organisation settings for the holiday calendar —
 * restricted-holiday entitlement limit and the footnote shown to employees.
 */
@Schema({ timestamps: true, collection: 'holiday-calendars' })
export class HolidayCalendar {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: Number, required: true, index: true })
  year: number;

  @Prop({ type: Number, default: 2, min: 0, max: 10 })
  restrictedLimit: number;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const HolidayCalendarSchema = SchemaFactory.createForClass(HolidayCalendar);
HolidayCalendarSchema.index({ organizationId: 1, year: 1 }, { unique: true });
