import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScoreCandidateDto {
  @ApiPropertyOptional({ enum: ['openai', 'opencode'], description: 'Defaults to AI_DEFAULT_PROVIDER' })
  @IsOptional()
  @IsEnum(['openai', 'opencode'])
  provider?: 'openai' | 'opencode';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AskCopilotDto {
  @ApiProperty({ example: 'How many casual leaves do I have left?' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  question: string;
}
