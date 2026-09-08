import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransitionDto {
  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({
    enum: ['PROMOTION', 'DEPARTMENT_TRANSFER', 'MANAGER_CHANGE', 'CONFIRMATION', 'COMPENSATION_REVISION'],
    example: 'PROMOTION',
  })
  @IsEnum(['PROMOTION', 'DEPARTMENT_TRANSFER', 'MANAGER_CHANGE', 'CONFIRMATION', 'COMPENSATION_REVISION'])
  type: 'PROMOTION' | 'DEPARTMENT_TRANSFER' | 'MANAGER_CHANGE' | 'CONFIRMATION' | 'COMPENSATION_REVISION';

  @ApiProperty({ example: '2026-10-01' })
  @IsString()
  @IsNotEmpty()
  effectiveDate: string;

  @ApiProperty({ example: 'Promoted to Senior Product Designer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Consistent high output and leadership of redesign initiative.' })
  @IsString()
  @IsOptional()
  justification?: string;

  @ApiPropertyOptional({ example: 'dept-uuid-456' })
  @IsString()
  @IsOptional()
  newDepartmentId?: string;

  @ApiPropertyOptional({ example: 'desg-uuid-789' })
  @IsString()
  @IsOptional()
  newDesignationId?: string;

  @ApiPropertyOptional({ example: 'manager-uuid-012' })
  @IsString()
  @IsOptional()
  newManagerId?: string;

  @ApiPropertyOptional({ example: 'FULL_TIME' })
  @IsString()
  @IsOptional()
  newEmploymentType?: string;
}

export class QueryTransitionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'PROMOTION', 'DEPARTMENT_TRANSFER', 'MANAGER_CHANGE', 'CONFIRMATION', 'COMPENSATION_REVISION'],
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'REJECTED'],
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  pageSize?: number;
}
