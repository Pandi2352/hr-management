import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export const HOLIDAY_TYPES = ['FIXED', 'RESTRICTED'] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export class CreateHolidayDto {
  @ApiProperty({ example: 'Diwali' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-11-08', description: 'Calendar date as YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiPropertyOptional({ enum: HOLIDAY_TYPES, default: 'FIXED' })
  @IsOptional()
  @IsEnum(HOLIDAY_TYPES)
  type?: HolidayType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}

export class UpdateHolidayCalendarDto {
  @ApiPropertyOptional({ example: 2, description: 'Restricted holidays each employee may avail' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  restrictedLimit?: number;

  @ApiPropertyOptional({ example: 'Holiday Calendar 2026' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateLeaveTypeDto {
  @ApiProperty({ example: 'CL' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Casual Leave' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultAllocation?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  carryForwardAllowed?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCarryForward?: number;
}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {}

export class AssignBalanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  leaveTypeId: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  allocated: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carriedForward?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  used?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SeedYearDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}

export class ApplyDefaultsDto extends SeedYearDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Also reset allocated days on existing wallets to the type defaults',
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}

export class AvailRestrictedHolidayDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  holidayId: string;
}
