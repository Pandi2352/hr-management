import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../../common/utils/uuid.util';

export type ProbationReviewDocument = ProbationReview & Document;

export class RatingDimension {
  @Prop({ required: true, trim: true })
  dimension: string;

  @Prop({ required: true, min: 1, max: 5 })
  score: number;

  @Prop({ default: '', trim: true })
  comments?: string;
}

@Schema({ timestamps: true, collection: 'probation_reviews' })
export class ProbationReview {
  @Prop({ type: String, default: () => generateUuid() })
  _id: string;

  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  employeeId: string;

  @Prop({ default: '' })
  joiningDate: string;

  @Prop({ required: true })
  probationEndDate: string;

  @Prop({
    default: 'PENDING_EVALUATION',
    enum: ['PENDING_EVALUATION', 'UNDER_HR_REVIEW', 'CONFIRMED', 'EXTENDED', 'TERMINATED'],
    index: true,
  })
  status: 'PENDING_EVALUATION' | 'UNDER_HR_REVIEW' | 'CONFIRMED' | 'EXTENDED' | 'TERMINATED';

  @Prop({ type: String, default: null })
  evaluatorId?: string | null;

  @Prop({ type: [RatingDimension], default: [] })
  ratings: RatingDimension[];

  @Prop({ type: Number, default: 0 })
  overallScore: number;

  @Prop({
    type: String,
    default: null,
    enum: [null, 'CONFIRM', 'EXTEND_30', 'EXTEND_60', 'EXTEND_90', 'TERMINATE'],
  })
  recommendation?: 'CONFIRM' | 'EXTEND_30' | 'EXTEND_60' | 'EXTEND_90' | 'TERMINATE' | null;

  @Prop({ default: '' })
  managerComments?: string;

  @Prop({ default: '' })
  hrNotes?: string;

  @Prop({ type: Date, default: null })
  evaluatedAt?: Date | null;

  @Prop({ type: Date, default: null })
  finalizedAt?: Date | null;

  @Prop({ type: String, default: null })
  finalizedBy?: string | null;

  @Prop({ default: '' })
  extensionEndDate?: string;
}

export const ProbationReviewSchema = SchemaFactory.createForClass(ProbationReview);

ProbationReviewSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true });
ProbationReviewSchema.index({ organizationId: 1, status: 1 });
ProbationReviewSchema.index({ organizationId: 1, probationEndDate: 1 });
