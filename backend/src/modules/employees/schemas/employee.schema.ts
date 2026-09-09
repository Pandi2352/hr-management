import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type EmployeeDocument = Employee & Document;

export class EmergencyContact {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  relationship: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: '', trim: true })
  alternatePhone?: string;

  @Prop({ default: '', lowercase: true, trim: true })
  email?: string;

  @Prop({ default: '', trim: true })
  address?: string;

  @Prop({ default: false })
  isPrimary: boolean;
}

export class Address {
  @Prop({ default: '' })
  addressLine1: string;

  @Prop({ default: '' })
  addressLine2?: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  state: string;

  @Prop({ default: '' })
  country: string;

  @Prop({ default: '' })
  postalCode: string;
}

export class EducationItem {
  @Prop({ required: true })
  institution: string;

  @Prop({ required: true })
  degree: string;

  @Prop({ default: '' })
  fieldOfStudy: string;

  @Prop({ default: '' })
  startDate: string;

  @Prop({ default: '' })
  endDate: string;

  @Prop({ default: '' })
  grade?: string;
}

export class ExperienceItem {
  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  role: string;

  @Prop({ default: '' })
  location?: string;

  @Prop({ default: '' })
  startDate: string;

  @Prop({ default: '' })
  endDate?: string;

  @Prop({ default: '' })
  description?: string;
}

export class SkillItem {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 'INTERMEDIATE', enum: ['BEGINNER', 'INTERMEDIATE', 'EXPERT'] })
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
}

export class DocumentItem {
  @Prop({ default: () => generateUuid() })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: 'GENERAL' })
  category: string;

  /** API path the client fetches; never a direct filesystem path. */
  @Prop({ required: true })
  fileUrl: string;

  /** Relative path inside the storage root. Server-side only. */
  @Prop({ default: '' })
  storageKey: string;

  @Prop({ default: '' })
  fileName: string;

  @Prop({ default: '' })
  mimeType: string;

  @Prop({ default: 0 })
  sizeBytes: number;

  @Prop({ default: () => new Date() })
  uploadedAt: Date;

  @Prop({ default: '' })
  uploadedBy: string;

  @Prop({ default: 'PENDING', enum: ['VERIFIED', 'PENDING', 'REJECTED'] })
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';

  @Prop({ default: '' })
  reviewNote: string;

  @Prop({ default: '' })
  reviewedBy: string;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;
}

@Schema({ timestamps: true, collection: 'employees' })
export class Employee {
  @Prop({ type: String, default: () => generateUuid() })
  _id: string;

  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  employeeCode: string;

  // Identity & Personal
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ default: '', trim: true })
  middleName?: string;

  @Prop({ default: '', trim: true })
  displayName?: string;

  @Prop({ default: '' })
  gender?: string;

  @Prop({ default: '' })
  dateOfBirth?: string;

  @Prop({ default: '' })
  maritalStatus?: string;

  @Prop({ default: '' })
  nationality?: string;

  @Prop({ default: '' })
  countryOfBirth?: string;

  @Prop({ default: '', trim: true })
  stateOfBirth?: string;

  @Prop({ default: '', trim: true })
  bloodGroup?: string;

  @Prop({ default: '', trim: true })
  nationalId?: string;

  @Prop({ default: '' })
  avatarUrl?: string;

  // Contact
  @Prop({ required: true, index: true, lowercase: true, trim: true })
  workEmail: string;

  @Prop({ type: String, default: null, index: true })
  userId?: string | null;

  @Prop({ default: '' })
  initialPassword?: string;

  @Prop({ type: String, default: 'PENDING', enum: ['PENDING', 'SENT', 'FAILED'] })
  onboardingEmailStatus?: 'PENDING' | 'SENT' | 'FAILED';

  @Prop({ type: Date, default: null })
  onboardingEmailSentAt?: Date | null;

  @Prop({ default: '', lowercase: true, trim: true })
  personalEmail?: string;

  @Prop({ default: '', trim: true })
  phone?: string;

  @Prop({ default: '', trim: true })
  alternatePhone?: string;

  @Prop({ default: '', lowercase: true, trim: true })
  secondaryEmail?: string;

  @Prop({ type: () => Address, default: () => ({}) })
  currentAddress?: Address;

  @Prop({ type: () => Address, default: () => ({}) })
  permanentAddress?: Address;

  @Prop({ type: [EmergencyContact], default: [] })
  emergencyContacts?: EmergencyContact[];

  // Employment Details
  @Prop({ type: String, default: null, index: true })
  departmentId?: string | null;

  @Prop({ type: String, default: null, index: true })
  designationId?: string | null;

  @Prop({ type: String, default: null, index: true })
  locationId?: string | null;

  @Prop({ type: String, default: null })
  costCenterId?: string | null;

  @Prop({ type: String, default: null, index: true })
  managerId?: string | null;

  @Prop({
    default: 'FULL_TIME',
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY', 'CONSULTANT'],
  })
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY' | 'CONSULTANT';

  @Prop({
    default: 'ACTIVE',
    enum: ['JOINING', 'ACTIVE', 'PROBATION', 'ON_LEAVE', 'ON_NOTICE', 'NOTICE_PERIOD', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'INACTIVE'],
    index: true,
  })
  status: 'JOINING' | 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'ON_NOTICE' | 'NOTICE_PERIOD' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'INACTIVE';

  @Prop({ required: true })
  joiningDate: string;

  @Prop({ default: '' })
  confirmationDate?: string;

  @Prop({ default: '' })
  resignationDate?: string;

  @Prop({ default: '' })
  lastWorkingDate?: string;

  @Prop({ default: '' })
  terminationReason?: string;

  // Career & Qualifications
  @Prop({ type: [EducationItem], default: [] })
  education?: EducationItem[];

  @Prop({ type: [ExperienceItem], default: [] })
  experience?: ExperienceItem[];

  @Prop({ type: [SkillItem], default: [] })
  skills?: SkillItem[];

  @Prop({ type: [DocumentItem], default: [] })
  documents?: DocumentItem[];

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, workEmail: 1 }, { unique: true });
EmployeeSchema.index({ organizationId: 1, departmentId: 1 });
EmployeeSchema.index({ organizationId: 1, status: 1 });
EmployeeSchema.index({ organizationId: 1, isDeleted: 1 });
