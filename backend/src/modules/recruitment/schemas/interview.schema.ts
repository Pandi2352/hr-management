import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type InterviewDocument = Interview & Document;

@Schema({ timestamps: true, collection: 'interviews' })
export class Interview {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true })
  jobTitle: string;

  @Prop({ type: Number, default: 1, min: 1 })
  roundNumber: number;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '', trim: true })
  interviewerName: string;

  /** `YYYY-MM-DD` */
  @Prop({ required: true })
  scheduledDate: string;

  /** `HH:mm` 24h */
  @Prop({ required: true })
  scheduledTime: string;

  @Prop({ type: String, enum: ['IN_PERSON', 'VIDEO', 'PHONE'], default: 'VIDEO' })
  mode: 'IN_PERSON' | 'VIDEO' | 'PHONE';

  @Prop({ default: '', trim: true })
  location: string;

  @Prop({
    type: String,
    enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'SCHEDULED',
    index: true,
  })
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

  @Prop({ type: Number, default: null, min: 1, max: 5 })
  rating: number | null;

  @Prop({ type: String, enum: ['HIRE', 'MAYBE', 'NO_HIRE', null], default: null })
  recommendation: 'HIRE' | 'MAYBE' | 'NO_HIRE' | null;

  @Prop({ default: '', trim: true })
  feedback: string;

  @Prop({ type: String, default: null })
  decidedBy: string | null;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);
InterviewSchema.index({ applicationId: 1, roundNumber: 1 });
InterviewSchema.index({ status: 1, scheduledDate: 1 });
