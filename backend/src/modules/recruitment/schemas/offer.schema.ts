import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type OfferDocument = Offer & Document;

@Schema({ timestamps: true, collection: 'offers' })
export class Offer {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, trim: true })
  candidateName: string;

  @Prop({ required: true, trim: true })
  jobTitle: string;

  @Prop({ default: '', trim: true })
  designation: string;

  @Prop({ default: '', trim: true })
  department: string;

  @Prop({ default: '', trim: true })
  salaryOffered: string;

  /** `YYYY-MM-DD` */
  @Prop({ default: '' })
  joiningDate: string;

  /** `YYYY-MM-DD` */
  @Prop({ default: '' })
  expiryDate: string;

  @Prop({ default: '', trim: true })
  notes: string;

  @Prop({
    type: String,
    enum: ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'],
    default: 'SENT',
    index: true,
  })
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';
}

export const OfferSchema = SchemaFactory.createForClass(Offer);
OfferSchema.index({ applicationId: 1 });
