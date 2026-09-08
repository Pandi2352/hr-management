import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(['HR', 'IT', 'MANAGER', 'EMPLOYEE'])
  category: 'HR' | 'IT' | 'MANAGER' | 'EMPLOYEE';

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsNumber()
  dueDaysFromJoining?: number;
}

export class InitializeOnboardingDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsString()
  targetJoiningDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomTaskDto)
  additionalTasks?: CustomTaskDto[];
}

export class UpdateTaskStatusDto {
  @IsNotEmpty()
  @IsEnum(['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'])
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUrls?: string[];
}

export class CandidateSubmitStepDto {
  @IsNotEmpty()
  @IsEnum(['PERSONAL', 'BANK', 'DOCUMENTS', 'POLICY'])
  step: 'PERSONAL' | 'BANK' | 'DOCUMENTS' | 'POLICY';

  @IsOptional()
  data: Record<string, any>;
}

export class QueryOnboardingDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
