import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type LocationDocument = Location & Document;

@Schema({ timestamps: true, collection: 'locations' })
export class Location {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ default: '', trim: true })
  addressLine2: string;

  @Prop({ required: true, trim: true, index: true })
  city: string;

  @Prop({ default: '', trim: true })
  state: string;

  @Prop({ default: '', trim: true })
  postalCode: string;

  @Prop({ required: true, trim: true, index: true })
  country: string;

  @Prop({ required: true, default: 'UTC' })
  timezone: string;

  @Prop({ type: Number, default: null })
  latitude: number | null;

  @Prop({ type: Number, default: null })
  longitude: number | null;

  @Prop({ default: '' })
  placeId: string;

  @Prop({ default: 0 })
  employeeCount: number;

  @Prop({ type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
LocationSchema.index({ organizationId: 1, name: 1 });
LocationSchema.index({ organizationId: 1, status: 1 });
