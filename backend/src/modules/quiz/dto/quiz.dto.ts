import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QUESTION_TYPES, type QuestionType } from '../question-grading.util';

export class QuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsEnum(QUESTION_TYPES)
  @IsOptional()
  type?: QuestionType;

  /**
   * The correct option, or -1 when the question has no options.
   *
   * `@Min(0)` rejected the -1 that a fill-in-the-blank carries, so saving a
   * reviewed draft containing one failed with "correctOptionIndex must not be
   * less than 0" — a message about a field the author never filled in, on a
   * question type that does not have options at all.
   *
   * Whether the key is actually valid depends on the question's type, which a
   * per-field rule cannot know. That check lives in `questionDefect`, which
   * runs on save and again at the review gate and names both the question and
   * the problem.
   */
  @IsInt()
  @Min(-1)
  @IsOptional()
  correctOptionIndex?: number;

  /** The correct options, for a question with more than one. */
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  correctOptionIndexes?: number[];

  /** What counts as right for a fill-in-the-blank. */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  acceptedAnswers?: string[];

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  points?: number;

  /**
   * What this question is about.
   *
   * The schema has carried these since tags were added, but the DTO did not,
   * so the validator stripped them on the way in and every question reached
   * the database untagged. That made the learning loop's concepts as coarse as
   * the quiz's category, which is one bucket for the whole quiz.
   */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  sourceEvidence?: string;
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


/**
 * How many of each kind of question to write.
 *
 * Every field optional, so an author who does not care gets a sensible default
 * spread rather than having to fill in four numbers to generate anything.
 */
export class QuestionMixDto {
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  SINGLE?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  MULTI?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  TRUE_FALSE?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  FILL_BLANK?: number;
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

  /**
   * The author's brief, kept apart from the topic.
   *
   * Concatenating the two into one topic string is what put a paragraph of
   * instructions inside every generated question stem.
   */
  @IsString()
  @IsOptional()
  refinedPrompt?: string;

  /** How many of each question type. Scaled to the total if they disagree. */
  @ValidateNested()
  @Type(() => QuestionMixDto)
  @IsOptional()
  typeMix?: QuestionMixDto;
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

  /**
   * The option chosen, or -1 for a question left unanswered.
   *
   * `@Min(0)` used to reject the -1, which meant an auto-submit at the end of a
   * timed quiz failed validation and the whole attempt was lost — precisely the
   * case the timer exists to handle. Unanswered is a legitimate answer, and the
   * grader already scores it zero.
   */
  @IsInt()
  @Min(-1)
  selectedOptionIndex: number;
  /**
   * The order the options were shown in, as handed out by the play endpoint.
   *
   * Without this, a shuffled quiz grades a chosen *position* against the
   * original answer key and marks nearly everyone wrong. Optional so an
   * unshuffled quiz, and any client that predates shuffling, still submits
   * cleanly.
   */
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  optionOrder?: number[];

  /** Every option ticked, for a multiple-answer question. */
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  selectedOptionIndexes?: number[];

  /** What was typed, for a fill-in-the-blank. */
  @IsString()
  @IsOptional()
  @MaxLength(300)
  textAnswer?: string;
}

export class SubmitQuizAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerItemDto)
  answers: QuizAnswerItemDto[];

  @IsInt()
  @Min(0)
  timeTakenSeconds: number;

  /**
   * Whether the timer submitted this rather than the person.
   *
   * Recorded because it changes how a low score should be read: a paper handed
   * in at the bell is not the same evidence as one handed in early.
   */
  @IsBoolean()
  @IsOptional()
  autoSubmitted?: boolean;
}


/** One question sent to the Question Doctor for review. */
export class DiagnoseQuestionDto {
  @IsEnum(QUESTION_TYPES)
  @IsOptional()
  type?: QuestionType;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  correctOptionIndexes?: number[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  acceptedAnswers?: string[];

  @IsString()
  @IsNotEmpty()
  prompt: string;

  /**
   * The options, or an empty list for a fill-in-the-blank.
   *
   * `@ArrayMinSize(2)` refused a question type that has no options at all, so
   * the Question Doctor could not be opened on one. How many options a
   * question needs depends on its type, and the doctor's own structural checks
   * already report that — with an explanation rather than a validator message.
   */
  @IsArray()
  @IsString({ each: true })
  options: string[];

  /**
   * The correct option, or -1 when the question has no options.
   *
   * `@Min(0)` rejected the -1 that a fill-in-the-blank carries, so saving a
   * reviewed draft containing one failed with "correctOptionIndex must not be
   * less than 0" — a message about a field the author never filled in, on a
   * question type that does not have options at all.
   *
   * Whether the key is actually valid depends on the question's type, which a
   * per-field rule cannot know. That check lives in `questionDefect`, which
   * runs on save and again at the review gate and names both the question and
   * the problem.
   */
  @IsInt()
  @Min(-1)
  @IsOptional()
  correctOptionIndex?: number;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  /** Pasted policy or handbook text, so the diagnosis can cite evidence. */
  @IsString()
  @IsOptional()
  @MaxLength(20000)
  sourceText?: string;
}

export class RegenerateQuestionDto {
  /** What to change. Omitted means "it is weak, do better". */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  instruction?: string;
}

/** Edits to a quiz that is not yet published. */
export class UpdateQuizDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

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
  @Min(0)
  @Max(2000)
  @IsOptional()
  xpReward?: number;

  @IsBoolean()
  @IsOptional()
  shuffleOptions?: boolean;

  @IsBoolean()
  @IsOptional()
  shuffleQuestions?: boolean;

  @IsOptional()
  attemptPolicy?: {
    maxAttempts?: number;
    scoring?: 'BEST' | 'LATEST';
    mustPass?: boolean;
    cooldownHours?: number;
  };

  /** Whole-question replacement, so an edit cannot half-apply. */
  @IsArray()
  @IsOptional()
  questions?: {
    type?: QuestionType;
    prompt: string;
    options: string[];
    correctOptionIndex?: number;
    correctOptionIndexes?: number[];
    acceptedAnswers?: string[];
    explanation?: string;
    points?: number;
    tags?: string[];
    section?: string;
    sourceEvidence?: string;
    isApproved?: boolean;
  }[];
}

export class ReviewQuizDto {
  /** Why it was sent back. Required on rejection, so the author knows what to fix. */
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}

export class AddBankQuestionDto {
  @IsEnum(QUESTION_TYPES)
  @IsOptional()
  type?: QuestionType;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  correctOptionIndexes?: number[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  acceptedAnswers?: string[];

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  /**
   * The correct option, or -1 when the question has no options.
   *
   * `@Min(0)` rejected the -1 that a fill-in-the-blank carries, so saving a
   * reviewed draft containing one failed with "correctOptionIndex must not be
   * less than 0" — a message about a field the author never filled in, on a
   * question type that does not have options at all.
   *
   * Whether the key is actually valid depends on the question's type, which a
   * per-field rule cannot know. That check lives in `questionDefect`, which
   * runs on save and again at the review gate and names both the question and
   * the problem.
   */
  @IsInt()
  @Min(-1)
  @IsOptional()
  correctOptionIndex?: number;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsInt()
  @IsOptional()
  points?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  @IsOptional()
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  sourceEvidence?: string;

  @IsString()
  @IsOptional()
  sourceQuizId?: string;
}

export class PullFromBankDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bankIds: string[];
}

/** One answer in a targeted retry. */
export class PracticeAnswerDto {
  @IsInt()
  @Min(0)
  questionIndex: number;

  /**
   * The option chosen, or -1 for one left blank.
   *
   * Practice has no timer, but a person can still hand in an incomplete set,
   * and refusing that would throw away the questions they did answer.
   */
  @IsInt()
  @Min(-1)
  selectedOptionIndex: number;
}

export class SubmitPracticeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PracticeAnswerDto)
  answers: PracticeAnswerDto[];
}

/**
 * A request to write a quiz in the background.
 *
 * Carries everything the studio had chosen at the moment the person pressed
 * generate, so the job is self-contained: the browser can close and the draft
 * still comes out with the duration, locale and template that were asked for.
 */
export class StartGenerationJobDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsInt()
  @Min(1)
  @Max(100)
  questionCount: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  @IsOptional()
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsInt()
  @Min(1)
  @Max(180)
  @IsOptional()
  durationMinutes?: number;

  /** The enhanced brief, when the author ran the prompt enhancer first. */
  @IsString()
  @IsOptional()
  refinedPrompt?: string;

  /** How many of each question type. Scaled to the total if they disagree. */
  @ValidateNested()
  @Type(() => QuestionMixDto)
  @IsOptional()
  typeMix?: QuestionMixDto;
}
