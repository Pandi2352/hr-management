import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PAYROLL_STATUSES, PayrollStatus } from '../schemas/payroll-record.schema';

/**
 * Only the *component* amounts are accepted. `grossEarnings`, `totalDeductions`
 * and `netPay` are deliberately absent — they are computed server-side, so a
 * caller cannot dictate what an employee gets paid.
 */
export class CreatePayrollDto {
  @ApiProperty({ description: 'Employee the payroll run is for' })
  @IsString()
  @IsNotEmpty({ message: 'Select an employee' })
  employeeId: string;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  totalDays: number;

  @ApiProperty({ minimum: 0, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(31)
  workingDays: number;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basicSalary: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allowances?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonus?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeAmount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxDeduction?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  providentFund?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherDeductions?: number;

  @ApiPropertyOptional({ enum: PAYROLL_STATUSES, default: 'PENDING' })
  @IsOptional()
  @IsEnum(PAYROLL_STATUSES)
  status?: PayrollStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  /** Dispatch the payslip immediately after processing. */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  sendPayslip?: boolean;
}

/** Every field optional; `employeeId` and the period are fixed once created. */
export class UpdatePayrollDto extends PartialType(CreatePayrollDto) {}

export class PayrollQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: [...PAYROLL_STATUSES, 'ALL'] })
  @IsOptional()
  @IsEnum([...PAYROLL_STATUSES, 'ALL'])
  status?: PayrollStatus | 'ALL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class SendPayslipDto {
  /** Overrides the employee's work email for this dispatch only. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}
