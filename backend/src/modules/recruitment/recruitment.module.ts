import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { JobVacancy, JobVacancySchema } from './schemas/job-vacancy.schema';
import { JobApplication, JobApplicationSchema } from './schemas/job-application.schema';
import { Organization, OrganizationSchema } from '../organization/schemas/organization.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobVacancy.name, schema: JobVacancySchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
