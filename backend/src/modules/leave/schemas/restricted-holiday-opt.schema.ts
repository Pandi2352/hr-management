import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type RestrictedHolidayOptDocument = RestrictedHolidayOpt & Document;

/** One availed restricted holiday — presence of the record is the availing. */
@Schema({ timestamps: true, collection: 'restricted-holiday-opts' })
export class RestrictedHolidayOpt {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true, index: true })
  holidayId: string;

  @Prop({ type: Number, required: true, index: true })
  year: number;
}

export const RestrictedHolidayOptSchema =
  SchemaFactory.createForClass(RestrictedHolidayOpt);
RestrictedHolidayOptSchema.index({ employeeId: 1, holidayId: 1 }, { unique: true });
RestrictedHolidayOptSchema.index({ organizationId: 1, employeeId: 1, year: 1 });
