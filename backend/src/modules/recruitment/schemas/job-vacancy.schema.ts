import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type JobVacancyDocument = JobVacancy & Document;

@Schema({ timestamps: true, collection: 'job_vacancies' })
export class JobVacancy {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  department: string;

  @Prop({ required: true, trim: true, default: 'Remote' })
  location: string;

  @Prop({ required: true, trim: true, default: 'Full-Time' })
  employmentType: string;

  @Prop({ default: 'Mid-Senior' })
  experienceLevel: string;

  @Prop({ required: true, trim: true, default: '$120K - $160K' })
  salaryRange: string;

  @Prop({ required: true, trim: true })
  overview: string;

  @Prop({ type: [String], default: [] })
  responsibilities: string[];

  @Prop({ type: [String], default: [] })
  requirements: string[];

  @Prop({ type: [String], default: [] })
  benefits: string[];

  @Prop({ default: 'web' })
  iconType: string;

  @Prop({ type: String, enum: ['OPEN', 'CLOSED', 'DRAFT'], default: 'OPEN', index: true })
  status: 'OPEN' | 'CLOSED' | 'DRAFT';

  @Prop({ default: 0 })
  appliedCount: number;

  @Prop({ default: false })
  isFeatured: boolean;
}

export const JobVacancySchema = SchemaFactory.createForClass(JobVacancy);
JobVacancySchema.index({ status: 1, department: 1 });
