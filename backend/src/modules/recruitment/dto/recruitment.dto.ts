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
  @IsEnum(['APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'REJECTED'])
  status: 'APPLIED' | 'SHORTLISTED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';
}
