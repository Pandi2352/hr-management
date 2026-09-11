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

  /**
   * The sign-in this record belongs to, stable across token rotation.
   *
   * A session document is one refresh-token generation, not one device: every
   * refresh retires the presented record and writes a new one. Without a family
   * id, a phone that had refreshed twenty times looked like twenty sessions,
   * nineteen of them dead, and the live one appeared to have been created
   * minutes ago rather than when the person actually signed in.
   *
   * Carried forward on every rotation, so one live record per device is what
   * the list shows.
   */
  @Prop({ type: String, required: true, index: true })
  familyId: string;

  /** When this device first signed in, carried across rotations. */
  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  /** The last time this device exchanged a refresh token. */
  @Prop({ type: Date, default: Date.now })
  lastUsedAt: Date;

  @Prop({ required: true, index: true })
  refreshTokenHash: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  // Parsed once at sign-in rather than on every read, so the list is a plain
  // query and the strings stay stable even if the parser improves later.
  @Prop({ type: String, default: '' })
  deviceLabel: string;

  @Prop({ type: String, default: '' })
  deviceType: string;

  @Prop({ required: true })
  expiresAt: Date;

  /** Carried across refresh rotations so the session keeps its original lifetime. */
  @Prop({ default: false })
  rememberMe: boolean;

  @Prop({ type: Date, default: null, index: true })
  revokedAt?: Date;

  /**
   * Why the session ended.
   *
   * Rotation revokes records constantly and normally; a person signing a
   * device out is a security event. Recording which is which is what lets the
   * two be told apart afterwards.
   */
  @Prop({
    type: String,
    enum: ['ROTATED', 'LOGOUT', 'REVOKED_BY_USER', 'REVOKED_BY_ADMIN', 'PASSWORD_CHANGED', ''],
    default: '',
  })
  revokedReason: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** The query behind the sessions list: one user's live records. */
SessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
