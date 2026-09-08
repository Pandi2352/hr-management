import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProbationReview,
  ProbationReviewSchema,
} from './schemas/probation-review.schema';
import {
  Employee,
  EmployeeSchema,
} from '../../employees/schemas/employee.schema';
import {
  Department,
  DepartmentSchema,
} from '../../organization/schemas/department.schema';
import {
  Designation,
  DesignationSchema,
} from '../../organization/schemas/designation.schema';
import { ProbationService } from './probation.service';
import { ProbationController } from './probation.controller';
import { OrganizationModule } from '../../organization/organization.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProbationReview.name, schema: ProbationReviewSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [ProbationController],
  providers: [ProbationService],
  exports: [ProbationService],
})
export class ProbationModule {}
