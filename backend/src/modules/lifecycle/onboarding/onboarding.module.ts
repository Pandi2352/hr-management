import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Onboarding, OnboardingSchema } from './schemas/onboarding.schema';
import { Employee, EmployeeSchema } from '../../employees/schemas/employee.schema';
import { Department, DepartmentSchema } from '../../organization/schemas/department.schema';
import { Designation, DesignationSchema } from '../../organization/schemas/designation.schema';
import { OnboardingService } from './onboarding.service';
import {
  OnboardingController,
  CandidateOnboardingController,
} from './onboarding.controller';
import { OrganizationModule } from '../../organization/organization.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Onboarding.name, schema: OnboardingSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [OnboardingController, CandidateOnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
