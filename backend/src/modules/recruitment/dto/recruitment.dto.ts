import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export class ApplyJobDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @IsString()
  @IsOptional()
  yearsExperience?: string;

  @IsString()
  @IsOptional()
  earliestStartDate?: string;

  @IsString()
  @IsOptional()
  coverLetter?: string;
}

export class CreateJobRequisitionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  employmentType?: string;

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsString()
  @IsOptional()
  salaryRange?: string;

  @IsString()
  @IsNotEmpty()
  overview: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @IsString()
  @IsOptional()
  iconType?: string;
}

export class UpdateApplicationStatusDto {
  @IsEnum(['APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'])
  status: 'APPLIED' | 'SHORTLISTED' | 'INTERVIEWING' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
}

export class MoveStageDto {
  @IsEnum(['SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'REJECTED', 'WITHDRAWN'])
  to: 'SHORTLISTED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED' | 'WITHDRAWN';

  @IsString()
  @IsOptional()
  note?: string;
}

export class ScheduleInterviewDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  interviewerName: string;

  @IsString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsString()
  @IsNotEmpty()
  scheduledTime: string;

  @IsEnum(['IN_PERSON', 'VIDEO', 'PHONE'])
  @IsOptional()
  mode?: 'IN_PERSON' | 'VIDEO' | 'PHONE';

  @IsString()
  @IsOptional()
  location?: string;
}

export class UpdateInterviewDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  interviewerName?: string;

  @IsString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @IsEnum(['IN_PERSON', 'VIDEO', 'PHONE'])
  @IsOptional()
  mode?: 'IN_PERSON' | 'VIDEO' | 'PHONE';

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(['SCHEDULED', 'CANCELLED', 'NO_SHOW'])
  @IsOptional()
  status?: 'SCHEDULED' | 'CANCELLED' | 'NO_SHOW';
}

export class InterviewFeedbackDto {
  @IsNumber()
  @IsOptional()
  rating?: number;

  @IsEnum(['HIRE', 'MAYBE', 'NO_HIRE'])
  recommendation: 'HIRE' | 'MAYBE' | 'NO_HIRE';

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateOfferDto {
  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  salaryOffered?: string;

  @IsString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOfferDto {
  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  salaryOffered?: string;

  @IsString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class OfferDecisionDto {
  @IsEnum(['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'])
  decision: 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';
}

export class HireCandidateDto {
  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  employmentType?: string;

  @IsString()
  @IsOptional()
  joiningDate?: string;
}
