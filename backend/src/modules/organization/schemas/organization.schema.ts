import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, trim: true, index: true })
  legalName: string;

  @Prop({ required: false, trim: true, default: '' })
  tradeName: string;

  @Prop({ required: false, trim: true, default: '' })
  registrationCode: string;

  @Prop({ required: false, trim: true, default: '' })
  taxId: string;

  @Prop({ required: true, lowercase: true, trim: true })
  corporateEmail: string;

  @Prop({ required: false, trim: true, default: '' })
  phone: string;

  @Prop({ required: false, trim: true, default: '' })
  website: string;

  @Prop({ required: true, default: 'Asia/Kolkata' })
  timezone: string;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ required: true, default: 'January' })
  fiscalYearStartMonth: string;

  @Prop({ required: false, default: '' })
  logoUrl: string;

  @Prop({ type: String, default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
