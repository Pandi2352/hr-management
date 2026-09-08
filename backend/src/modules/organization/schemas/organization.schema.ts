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

  @Prop({ required: false, trim: true, default: 'Private Limited' })
  organizationType: string;

  @Prop({ required: false, trim: true, default: 'EMP' })
  employeeIdPrefix: string;

  @Prop({ required: false, trim: true, default: 'United States' })
  registrationCountry: string;

  @Prop({ required: false, trim: true, default: '' })
  registrationDate: string;

  @Prop({ required: false, trim: true, default: '' })
  primaryContactPerson: string;

  @Prop({ required: false, lowercase: true, trim: true, default: '' })
  supportEmail: string;

  @Prop({ required: false, trim: true, default: '' })
  supportPhone: string;

  @Prop({ required: false, trim: true, default: '' })
  addressLine1: string;

  @Prop({ required: false, trim: true, default: '' })
  addressLine2: string;

  @Prop({ required: false, trim: true, default: '' })
  city: string;

  @Prop({ required: false, trim: true, default: '' })
  state: string;

  @Prop({ required: false, trim: true, default: '' })
  country: string;

  @Prop({ required: false, trim: true, default: '' })
  postalCode: string;

  @Prop({
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  })
  workingDays: string[];

  @Prop({ required: false, default: 8 })
  standardWorkingHours: number;

  @Prop({ required: false, default: '09:00' })
  workStartTime: string;

  @Prop({ required: false, default: '18:00' })
  workEndTime: string;

  @Prop({ required: false, default: 'DD/MM/YYYY' })
  dateFormat: string;

  @Prop({ required: false, default: '12 Hour' })
  timeFormat: string;

  @Prop({ required: false, default: '1,234,567.89' })
  numberFormat: string;

  @Prop({ type: String, default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
