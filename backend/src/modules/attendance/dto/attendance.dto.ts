import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class PunchDto {
  @ApiPropertyOptional({ example: '2026-09-09', description: 'Defaults to today' })
  @IsOptional()
  @IsString()
  @Matches(DATE_RE, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({ example: '09:30', description: 'Defaults to now (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(TIME_RE, { message: 'time must be HH:mm (24h)' })
  time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
