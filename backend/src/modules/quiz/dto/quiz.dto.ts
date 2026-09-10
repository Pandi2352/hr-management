import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correctOptionIndex: number;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  points?: number;
}

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  @IsOptional()
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @IsInt()
  @Min(1)
  @Max(180)
  @IsOptional()
  timeLimitMinutes?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  passingScorePct?: number;

  @IsInt()
  @Min(10)
  @IsOptional()
  xpReward?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}

export class GenerateAiQuizDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  @IsOptional()
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @IsInt()
  @Min(3)
  @Max(15)
  @IsOptional()
  questionCount?: number;
}

export class EnhanceQuizPromptDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  @IsOptional()
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @IsInt()
  @Min(3)
  @Max(15)
  @IsOptional()
  questionCount?: number;
}

export class AssignQuizDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  employeeIds?: string[];

  @IsBoolean()
  @IsOptional()
  assignAll?: boolean;

  @IsString()
  @IsOptional()
  dueDate?: string;
}

export class QuizAnswerItemDto {
  @IsInt()
  @Min(0)
  questionIndex: number;

  @IsInt()
  @Min(0)
  selectedOptionIndex: number;
}

export class SubmitQuizAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  answers: QuizAnswerItemDto[];

  @IsInt()
  @Min(0)
  timeTakenSeconds: number;
}
