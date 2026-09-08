import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../../common/utils/uuid.util';

export type LifecycleTransitionDocument = LifecycleTransition & Document;

@Schema({ timestamps: true, collection: 'lifecycle_transitions' })
export class LifecycleTransition {
  @Prop({ type: String, default: () => generateUuid() })
  _id: string;

  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  employeeId: string;

  @Prop({
    required: true,
    enum: ['PROMOTION', 'DEPARTMENT_TRANSFER', 'MANAGER_CHANGE', 'CONFIRMATION', 'COMPENSATION_REVISION'],
    index: true,
  })
  type: 'PROMOTION' | 'DEPARTMENT_TRANSFER' | 'MANAGER_CHANGE' | 'CONFIRMATION' | 'COMPENSATION_REVISION';

  @Prop({ required: true })
  effectiveDate: string;

  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  justification: string;

  @Prop({ type: Object, default: () => ({}) })
  previousState: {
    departmentId?: string | null;
    departmentName?: string | null;
    designationId?: string | null;
    designationTitle?: string | null;
    managerId?: string | null;
    managerName?: string | null;
    employmentType?: string | null;
  };

  @Prop({ type: Object, default: () => ({}) })
  newState: {
    departmentId?: string | null;
    departmentName?: string | null;
    designationId?: string | null;
    designationTitle?: string | null;
    managerId?: string | null;
    managerName?: string | null;
    employmentType?: string | null;
  };

  @Prop({
    default: 'APPROVED',
    enum: ['PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'REJECTED'],
    index: true,
  })
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'APPLIED' | 'REJECTED';

  @Prop({ type: String, default: null })
  initiatedBy?: string | null;

  @Prop({ type: String, default: null })
  approvedBy?: string | null;

  @Prop({ type: Date, default: null })
  appliedAt?: Date | null;
}

export const LifecycleTransitionSchema = SchemaFactory.createForClass(LifecycleTransition);

LifecycleTransitionSchema.index({ organizationId: 1, employeeId: 1, createdAt: -1 });
LifecycleTransitionSchema.index({ organizationId: 1, type: 1 });
LifecycleTransitionSchema.index({ organizationId: 1, status: 1 });
