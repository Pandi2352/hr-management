import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type BusinessSettingDocument = BusinessSetting & Document;

@Schema({ _id: false })
export class SmtpConfig {
  @Prop({ required: false, default: '', trim: true })
  host: string;

  @Prop({ required: true, default: 587 })
  port: number;

  @Prop({ required: false, default: '', trim: true })
  user: string;

  @Prop({ required: false, default: '', trim: true })
  pass: string;

  @Prop({ required: false, default: '', trim: true })
  fromName: string;

  @Prop({ required: false, default: '', trim: true })
  fromEmail: string;

  @Prop({ required: false, default: false })
  secure: boolean;

  @Prop({ required: false, default: false })
  isConfigured: boolean;

  @Prop({ required: false, default: null })
  lastVerifiedAt: Date;
}

export const SmtpConfigSchema = SchemaFactory.createForClass(SmtpConfig);

@Schema({ _id: false })
export class S3Config {
  @Prop({ required: false, default: '', trim: true })
  bucket: string;

  @Prop({ required: false, default: 'us-east-1', trim: true })
  region: string;

  @Prop({ required: false, default: '', trim: true })
  accessKeyId: string;

  @Prop({ required: false, default: '', trim: true })
  secretAccessKey: string;

  @Prop({ required: false, default: '', trim: true })
  endpoint: string;

  @Prop({ required: false, default: false })
  forcePathStyle: boolean;

  @Prop({ required: false, default: '', trim: true })
  publicUrlBase: string;

  @Prop({ required: false, default: false })
  isConfigured: boolean;

  @Prop({ required: false, default: null })
  lastVerifiedAt: Date;
}

export const S3ConfigSchema = SchemaFactory.createForClass(S3Config);

@Schema({ timestamps: true, collection: 'business_settings' })
export class BusinessSetting {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: false, trim: true, index: true, default: 'default' })
  organizationId: string;

  @Prop({ type: SmtpConfigSchema, default: () => ({}) })
  smtp: SmtpConfig;

  @Prop({ type: S3ConfigSchema, default: () => ({}) })
  s3_config: S3Config;

  @Prop({ required: false, trim: true, default: 'System' })
  updatedBy: string;
}

export const BusinessSettingSchema = SchemaFactory.createForClass(BusinessSetting);
