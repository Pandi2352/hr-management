import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type CostCenterDocument = CostCenter & Document;

@Schema({ timestamps: true, collection: 'cost_centers' })
export class CostCenter {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null, index: true })
  departmentId: string | null;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const CostCenterSchema = SchemaFactory.createForClass(CostCenter);
CostCenterSchema.index({ organizationId: 1, code: 1 }, { unique: true });
CostCenterSchema.index({ organizationId: 1, status: 1 });
