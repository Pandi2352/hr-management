import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Self-authored profile fields only.
 *
 * Identity — name, avatar, department, designation — is deliberately absent:
 * it is denormalised from the employee record and owned by HR. Letting someone
 * PATCH their own department here would make the social directory disagree with
 * the HR one.
 */
export class UpdateAtriumProfileDto {
  @ApiPropertyOptional({ maxLength: 280 })
  @IsOptional()
  @IsString()
  @MaxLength(280, { message: 'Keep your bio to 280 characters.' })
  bio?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Up to 10 interests.' })
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 6 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'Up to 6 "ask me about" topics.' })
  @IsString({ each: true })
  askMeAbout?: string[];

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  pronouns?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  location?: string;

  @ApiPropertyOptional({ description: 'Opt in to showing your birthday (day and month only).' })
  @IsOptional()
  @IsBoolean()
  showBirthday?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showWorkAnniversary?: boolean;

  @ApiPropertyOptional({ description: 'Accent colour key; must be one of the supported palette keys.' })
  @IsOptional()
  @IsString()
  accent?: string;

  /**
   * Today's mood. Send an empty emoji to clear it.
   *
   * Length is capped rather than validated against an allow-list: emoji are
   * multi-codepoint (a flag is two, a family can be seven), so a character
   * whitelist would reject perfectly ordinary input.
   */
  @ApiPropertyOptional({ maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  moodEmoji?: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Keep your status to 60 characters.' })
  moodText?: string;
}

export class AtriumDirectoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  /** `following` | `not-following` | `all` — filter by your own relationship. */
  @ApiPropertyOptional({ enum: ['all', 'following', 'not-following'] })
  @IsOptional()
  @IsString()
  relationship?: 'all' | 'following' | 'not-following';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class FollowListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
