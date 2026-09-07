import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PasswordResetToken {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, index: true })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: null })
  usedAt: Date | null;

  @Prop({ default: null })
  requestedIp: string | null;

  @Prop({ default: null })
  userAgent: string | null;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);

// Auto-purge expired tokens with TTL index
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
