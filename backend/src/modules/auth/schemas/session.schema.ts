import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type SessionDocument = Session & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Session {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  refreshTokenHash: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: true })
  expiresAt: Date;

  /** Carried across refresh rotations so the session keeps its original lifetime. */
  @Prop({ default: false })
  rememberMe: boolean;

  @Prop({ type: Date, default: null, index: true })
  revokedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
