import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type JobApplicationDocument = JobApplication & Document;

@Schema({ timestamps: true, collection: 'job_applications' })
export class JobApplication {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ required: true, trim: true })
  jobTitle: string;

  @Prop({ required: true, trim: true })
  department: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ default: '' })
  linkedinUrl: string;

  @Prop({ default: '' })
  portfolioUrl: string;

  @Prop({ default: '1-3 years' })
  yearsExperience: string;

  @Prop({ default: 'Immediately' })
  earliestStartDate: string;

  @Prop({ default: '' })
  coverLetter: string;

  @Prop({ required: true })
  resumeFileName: string;

  @Prop({ required: true })
  resumeOriginalName: string;

  @Prop({ required: true })
  resumeUrl: string;

  @Prop({
    type: String,
    enum: ['APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'],
    default: 'APPLIED',
    index: true,
  })
  status: 'APPLIED' | 'SHORTLISTED' | 'INTERVIEWING' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
}

export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);
JobApplicationSchema.index({ jobId: 1, email: 1 });
JobApplicationSchema.index({ createdAt: -1 });
