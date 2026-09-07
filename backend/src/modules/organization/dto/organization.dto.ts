import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Legal Name is required' })
  @MinLength(2, { message: 'Legal Name must be at least 2 characters' })
  @MaxLength(150, { message: 'Legal Name cannot exceed 150 characters' })
  legalName: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  tradeName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  registrationCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxId?: string;

  @IsEmail({}, { message: 'Valid corporate email is required' })
  @IsNotEmpty()
  corporateEmail: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsNotEmpty({ message: 'Timezone is required' })
  timezone: string;

  @IsString()
  @IsNotEmpty({ message: 'Currency is required' })
  currency: string;

  @IsString()
  @IsNotEmpty({ message: 'Fiscal Year Start Month is required' })
  fiscalYearStartMonth: string;
}

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Department name is required' })
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Department code is required' })
  @MinLength(2)
  @MaxLength(30)
  code: string;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsString()
  @IsOptional()
  headEmployeeId?: string | null;

  @IsString()
  @IsOptional()
  costCenterId?: string | null;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateDepartmentDto extends CreateDepartmentDto {}

export class UpdateDepartmentParentDto {
  @IsString()
  @IsOptional()
  parentId: string | null;
}

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty({ message: 'Designation title is required' })
  @MinLength(2)
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Designation code is required' })
  @MinLength(2)
  @MaxLength(30)
  code: string;

  @IsOptional()
  grade?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateDesignationDto extends CreateDesignationDto {}

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'Location name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsNotEmpty({ message: 'Country is required' })
  country: string;

  @IsString()
  @IsNotEmpty({ message: 'Timezone is required' })
  timezone: string;

  @IsOptional()
  latitude?: number | null;

  @IsOptional()
  longitude?: number | null;
}

export class UpdateLocationDto extends CreateLocationDto {}

export class CreateCostCenterDto {
  @IsString()
  @IsNotEmpty({ message: 'Cost center code is required' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Cost center name is required' })
  name: string;

  @IsString()
  @IsOptional()
  departmentId?: string | null;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateCostCenterDto extends CreateCostCenterDto {}
