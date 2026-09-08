import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RatingDimensionDto {
  @ApiProperty({ example: 'Job Knowledge & Quality' })
  @IsString()
  @IsNotEmpty()
  dimension: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @ApiPropertyOptional({ example: 'Exceeds expectation in task delivery' })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class EvaluateProbationDto {
  @ApiProperty({ type: [RatingDimensionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatingDimensionDto)
  ratings: RatingDimensionDto[];

  @ApiProperty({
    enum: ['CONFIRM', 'EXTEND_30', 'EXTEND_60', 'EXTEND_90', 'TERMINATE'],
    example: 'CONFIRM',
  })
  @IsEnum(['CONFIRM', 'EXTEND_30', 'EXTEND_60', 'EXTEND_90', 'TERMINATE'])
  recommendation: 'CONFIRM' | 'EXTEND_30' | 'EXTEND_60' | 'EXTEND_90' | 'TERMINATE';

  @ApiPropertyOptional({ example: 'Strong contributor, recommended for full employment.' })
  @IsString()
  @IsOptional()
  managerComments?: string;
}

export class SignoffProbationDto {
  @ApiProperty({
    enum: ['CONFIRM', 'EXTEND_30', 'EXTEND_60', 'EXTEND_90', 'TERMINATE'],
    example: 'CONFIRM',
  })
  @IsEnum(['CONFIRM', 'EXTEND_30', 'EXTEND_60', 'EXTEND_90', 'TERMINATE'])
  action: 'CONFIRM' | 'EXTEND_30' | 'EXTEND_60' | 'EXTEND_90' | 'TERMINATE';

  @ApiPropertyOptional({ example: 'Approved by HR Operations.' })
  @IsString()
  @IsOptional()
  hrNotes?: string;
}

export class CreateProbationDto {
  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsString()
  @IsOptional()
  probationEndDate?: string;
}

export class QueryProbationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'PENDING_EVALUATION', 'UNDER_HR_REVIEW', 'CONFIRMED', 'EXTENDED', 'TERMINATED'],
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    enum: ['ALL', '15_DAYS', '30_DAYS', 'OVERDUE'],
  })
  @IsString()
  @IsOptional()
  urgency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  pageSize?: number;
}
