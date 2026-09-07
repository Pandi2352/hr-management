import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../utils/uuid.util';
import { ActorType, AuditStatus } from './audit.constants';

export type AuditLogDocument = AuditLog & Document;

/**
 * Append-only audit record.
 *
 * Immutability is enforced by only ever exposing reads through AuditController
 * (no PATCH/DELETE routes) and by AuditService being the sole writer — see
 * checklist §18/§19.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  // --- Actor -------------------------------------------------------------
  @Prop({ type: String, default: null, index: true })
  actorUserId: string | null;

  @Prop({ type: String, default: null, index: true })
  actorEmployeeId: string | null;

  /** Denormalized so the log stays readable if the account is later removed. */
  @Prop({ default: '' })
  actorName: string;

  @Prop({ default: '' })
  actorEmail: string;

  @Prop({ type: String, enum: Object.values(ActorType), default: ActorType.USER })
  actorType: ActorType;

  // --- What happened -----------------------------------------------------
  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true, index: true })
  resourceType: string;

  @Prop({ type: String, default: null, index: true })
  resourceId: string | null;

  /** Pre-rendered human summary so the table needn't parse JSON to show a row. */
  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, enum: Object.values(AuditStatus), default: AuditStatus.SUCCESS, index: true })
  status: AuditStatus;

  // --- Change payload (sanitized, changed-fields-only) -------------------
  @Prop({ type: Object, default: null })
  oldValue: Record<string, any> | null;

  @Prop({ type: Object, default: null })
  newValue: Record<string, any> | null;

  @Prop({ type: Object, default: null })
  metadata: Record<string, any> | null;

  // --- Correlation & forensics ------------------------------------------
  @Prop({ type: String, default: null, index: true })
  requestId: string | null;

  @Prop({ type: String, default: null })
  sessionId: string | null;

  @Prop({ default: '' })
  ipAddress: string;

  @Prop({ default: '' })
  userAgent: string;

  @Prop({ default: '' })
  deviceType: string;

  @Prop()
  createdAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Composite indexes for the filters the audit UI actually issues (§24).
AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, resourceType: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
