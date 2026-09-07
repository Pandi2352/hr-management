import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type LoginAttemptDocument = LoginAttempt & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class LoginAttempt {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: true, index: true })
  success: boolean;

  @Prop({ required: false })
  failureReason?: string;
}

export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);

LoginAttemptSchema.index({ ipAddress: 1, createdAt: -1 });
LoginAttemptSchema.index({ email: 1, createdAt: -1 });
