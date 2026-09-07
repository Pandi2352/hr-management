import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type InvitationDocument = Invitation & Document;

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: false, index: true })
  organizationId?: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: [String], default: [] })
  roles: string[];

  @Prop({ required: true, index: true, select: false })
  tokenHash: string;

  @Prop({
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.PENDING,
    index: true,
  })
  status: InvitationStatus;

  @Prop({ required: true })
  invitedByUserId: string;

  @Prop({ default: '' })
  invitedByName: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  acceptedAt?: Date | null;

  @Prop({ default: 0 })
  resendCount: number;

  @Prop({ type: Date, default: null })
  lastResentAt?: Date | null;

  @Prop({ type: Date, default: null })
  revokedAt?: Date | null;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.index({ email: 1, status: 1 });
