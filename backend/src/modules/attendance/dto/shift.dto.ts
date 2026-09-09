import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateShiftDto {
  @ApiProperty({ example: 'General Day Shift' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'GENERAL' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(TIME_RE, { message: 'startTime must be HH:mm (24h)' })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(TIME_RE, { message: 'endTime must be HH:mm (24h)' })
  endTime: string;

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  graceMinutes?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}

export class RaiseRegularizationDto {
  @ApiProperty({ example: '2026-09-08' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: '09:05' })
  @IsString()
  @Matches(TIME_RE, { message: 'requestedCheckIn must be HH:mm (24h)' })
  requestedCheckIn: string;

  @ApiPropertyOptional({ example: '18:10' })
  @IsOptional()
  @IsString()
  @Matches(TIME_RE, { message: 'requestedCheckOut must be HH:mm (24h)' })
  requestedCheckOut?: string;

  @ApiProperty({ example: 'Forgot to punch — biometric queue' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class DecideRegularizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
