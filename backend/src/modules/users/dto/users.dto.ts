import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { UserStatus } from '../../../common/constants';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class AssignRolesDto {
  @IsArray()
  @IsString({ each: true })
  roles: string[];

  /**
   * Optional department ids this user's employee-data visibility is restricted
   * to. Descendant departments are included automatically at query time.
   */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentScope?: string[];
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}

export class UpdateSecurityPolicyDto {
  @IsNumber()
  @Min(6)
  @Max(32)
  @IsOptional()
  passwordMinLength?: number;

  @IsBoolean()
  @IsOptional()
  passwordRequireUppercase?: boolean;

  @IsBoolean()
  @IsOptional()
  passwordRequireLowercase?: boolean;

  @IsBoolean()
  @IsOptional()
  passwordRequireNumbers?: boolean;

  @IsBoolean()
  @IsOptional()
  passwordRequireSymbols?: boolean;

  @IsNumber()
  @Min(5)
  @Max(1440)
  @IsOptional()
  sessionTimeoutMinutes?: number;

  @IsNumber()
  @Min(3)
  @Max(20)
  @IsOptional()
  maxFailedAttempts?: number;

  @IsNumber()
  @Min(5)
  @Max(1440)
  @IsOptional()
  lockoutDurationMinutes?: number;
}
