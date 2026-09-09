import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruitmentController } from './recruitment.controller';
import { PipelineController } from './pipeline.controller';
import { RecruitmentService } from './recruitment.service';
import { PipelineService } from './pipeline.service';
import { JobVacancy, JobVacancySchema } from './schemas/job-vacancy.schema';
import { JobApplication, JobApplicationSchema } from './schemas/job-application.schema';
import { Interview, InterviewSchema } from './schemas/interview.schema';
import { Offer, OfferSchema } from './schemas/offer.schema';
import { Organization, OrganizationSchema } from '../organization/schemas/organization.schema';
import { OrganizationModule } from '../organization/organization.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobVacancy.name, schema: JobVacancySchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: Interview.name, schema: InterviewSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    OrganizationModule,
    // Hire handoff provisions via the standard onboarding engine.
    // No cycle: EmployeesModule never imports RecruitmentModule.
    EmployeesModule,
  ],
  controllers: [RecruitmentController, PipelineController],
  providers: [RecruitmentService, PipelineService],
  exports: [RecruitmentService, PipelineService],
})
export class RecruitmentModule {}
