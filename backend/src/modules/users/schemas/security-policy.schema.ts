import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type SecurityPolicyDocument = SecurityPolicy & Document;

@Schema({ timestamps: true })
export class SecurityPolicy {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: false, index: true })
  organizationId?: string;

  // Password Policies
  @Prop({ default: 8 })
  passwordMinLength: number;

  @Prop({ default: true })
  passwordRequireUppercase: boolean;

  @Prop({ default: true })
  passwordRequireLowercase: boolean;

  @Prop({ default: true })
  passwordRequireNumbers: boolean;

  @Prop({ default: true })
  passwordRequireSymbols: boolean;

  // Session & Inactivity Policies
  @Prop({ default: 60 })
  sessionTimeoutMinutes: number;

  // Brute-force Lockout Policies
  @Prop({ default: 5 })
  maxFailedAttempts: number;

  @Prop({ default: 30 })
  lockoutDurationMinutes: number;
}

export const SecurityPolicySchema = SchemaFactory.createForClass(SecurityPolicy);
