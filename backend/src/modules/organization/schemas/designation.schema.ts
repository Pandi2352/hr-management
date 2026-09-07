import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type DesignationDocument = Designation & Document;

@Schema({ timestamps: true, collection: 'designations' })
export class Designation {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, min: 1, max: 10, default: 5 })
  grade: number;

  @Prop({ default: 0 })
  assignedEmployeeCount: number;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: 'ACTIVE' | 'INACTIVE';

  @Prop({ default: false, index: true })
  isDeleted: boolean;
}

export const DesignationSchema = SchemaFactory.createForClass(Designation);
DesignationSchema.index({ organizationId: 1, code: 1 }, { unique: true });
DesignationSchema.index({ organizationId: 1, status: 1 });
