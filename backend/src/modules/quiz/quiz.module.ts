import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quiz, QuizSchema } from './schemas/quiz.schema';
import { QuizAssignment, QuizAssignmentSchema } from './schemas/quiz-assignment.schema';
import { QuizAttempt, QuizAttemptSchema } from './schemas/quiz-attempt.schema';
import { EmployeeGamification, EmployeeGamificationSchema } from './schemas/gamification.schema';
import { BankQuestion, BankQuestionSchema } from './schemas/question-bank.schema';
import {
  QuizGenerationJob,
  QuizGenerationJobSchema,
} from './schemas/quiz-generation-job.schema';
import {
  LearningLoop,
  LearningLoopSchema,
  PracticeSet,
  PracticeSetSchema,
} from './schemas/learning-loop.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { AiModule } from '../ai/ai.module';
import { OrganizationModule } from '../organization/organization.module';
import { QuizService } from './quiz.service';
import { QuizAuthoringService } from './quiz-authoring.service';
import { LearningLoopService } from './learning-loop.service';
import { QuizInsightsService } from './quiz-insights.service';
import { QuizGenerationService } from './quiz-generation.service';
import { QuizController } from './quiz.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizAssignment.name, schema: QuizAssignmentSchema },
      { name: QuizAttempt.name, schema: QuizAttemptSchema },
      { name: EmployeeGamification.name, schema: EmployeeGamificationSchema },
      { name: BankQuestion.name, schema: BankQuestionSchema },
      { name: LearningLoop.name, schema: LearningLoopSchema },
      { name: QuizGenerationJob.name, schema: QuizGenerationJobSchema },
      { name: PracticeSet.name, schema: PracticeSetSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    AiModule,
    OrganizationModule,
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizAuthoringService, LearningLoopService, QuizInsightsService, QuizGenerationService],
  exports: [QuizService],
})
export class QuizModule {}
