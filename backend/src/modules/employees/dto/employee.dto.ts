import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';

/**
 * Kept in step with the `employmentType` enum on the Employee schema —
 * `TEMPORARY` is a valid stored value and was previously rejected by the DTO.
 */
export const EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
  'TEMPORARY',
  'CONSULTANT',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_STATUSES = [
  'ACTIVE',
  'PROBATION',
  'ON_NOTICE',
  'NOTICE_PERIOD',
  'SUSPENDED',
  'INACTIVE',
  'TERMINATED',
  'ON_LEAVE',
  'RESIGNED',
  'JOINING',
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const WORK_TYPES = ['ON_SITE', 'REMOTE', 'HYBRID'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const SHIFTS = ['GENERAL', 'MORNING', 'EVENING', 'NIGHT', 'FLEXIBLE'] as const;
export type Shift = (typeof SHIFTS)[number];

export class IdentificationDto {
  @ApiPropertyOptional({ default: 'PASSPORT' })
  @IsOptional()
  @IsString()
  idType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiryDate?: string;
}

export class PayrollInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ default: 'DIRECT_DEPOSIT' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ifscCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountHolderName?: string;
}

export class EmergencyContactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  relationship: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => typeof o.email === 'string' && o.email.trim().length > 0)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isPrimary?: boolean;
}

export class AddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class EducationItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  institution: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  degree: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;
}

export class ExperienceItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class SkillItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'EXPERT'], default: 'INTERMEDIATE' })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'EXPERT'])
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
}

export class DocumentItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ enum: ['VERIFIED', 'PENDING', 'REJECTED'] })
  @IsOptional()
  @IsEnum(['VERIFIED', 'PENDING', 'REJECTED'])
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED';
}

export class CreateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => typeof o.secondaryEmail === 'string' && o.secondaryEmail.trim().length > 0)
  @IsEmail()
  secondaryEmail?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  currentAddress?: AddressDto;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  permanentAddress?: AddressDto;

  @ApiPropertyOptional({ type: [EmergencyContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  emergencyContacts?: EmergencyContactDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ enum: EMPLOYMENT_TYPES, default: 'FULL_TIME' })
  @IsEnum(EMPLOYMENT_TYPES)
  employmentType: EmploymentType;

  @ApiPropertyOptional({ enum: WORK_TYPES, default: 'ON_SITE' })
  @IsOptional()
  @IsEnum(WORK_TYPES)
  workType?: WorkType;

  @ApiPropertyOptional({ enum: SHIFTS, default: 'GENERAL' })
  @IsOptional()
  @IsEnum(SHIFTS)
  shift?: Shift;

  @ApiPropertyOptional({ type: IdentificationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentificationDto)
  identification?: IdentificationDto;

  @ApiPropertyOptional({ type: PayrollInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollInfoDto)
  payrollInfo?: PayrollInfoDto;

  @ApiPropertyOptional({
    enum: EMPLOYMENT_STATUSES,
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(EMPLOYMENT_STATUSES)
  status?: EmploymentStatus;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  joiningDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmationDate?: string;

  @ApiPropertyOptional({ type: [EducationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationItemDto)
  education?: EducationItemDto[];

  @ApiPropertyOptional({ type: [ExperienceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceItemDto)
  experience?: ExperienceItemDto[];

  @ApiPropertyOptional({ type: [SkillItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillItemDto)
  skills?: SkillItemDto[];

  @ApiPropertyOptional({ type: [DocumentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentItemDto)
  documents?: DocumentItemDto[];
}

/**
 * PATCH is a partial update. Extending CreateEmployeeDto directly made
 * firstName, lastName, joiningDate and employmentType mandatory on every edit,
 * so a single-field change (a promotion, a department move) was rejected with
 * 400 unless the caller re-sent the whole record.
 */
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class EmployeeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  // Constrained rather than a free @IsString() so a typo'd filter fails loudly
  // instead of silently returning an empty roster. 'ALL' clears the filter.
  @ApiPropertyOptional({ enum: [...EMPLOYMENT_TYPES, 'ALL'] })
  @IsOptional()
  @IsEnum([...EMPLOYMENT_TYPES, 'ALL'])
  employmentType?: EmploymentType | 'ALL';
}

export class ChangeEmployeeStatusDto {
  @ApiProperty({
    enum: EMPLOYMENT_STATUSES,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(EMPLOYMENT_STATUSES)
  status: EmploymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveDate?: string;
}

