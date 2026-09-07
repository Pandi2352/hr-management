import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type OtpDocument = PasswordResetOtp & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PasswordResetOtp {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true })
  otpHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  isUsed: boolean;
}

export const PasswordResetOtpSchema = SchemaFactory.createForClass(PasswordResetOtp);

// TTL index to automatically purge expired OTP documents
PasswordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
