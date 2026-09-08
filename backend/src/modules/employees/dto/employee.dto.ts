import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  ValidateNested,
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
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

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

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'NOTICE_PERIOD', 'TERMINATED'],
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'PROBATION', 'ON_LEAVE', 'NOTICE_PERIOD', 'TERMINATED'])
  status?: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'NOTICE_PERIOD' | 'TERMINATED';

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
    enum: ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'INACTIVE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'INACTIVE'])
  status: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'INACTIVE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  effectiveDate?: string;
}

