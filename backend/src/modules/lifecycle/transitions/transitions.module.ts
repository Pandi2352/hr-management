import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LifecycleTransition,
  LifecycleTransitionSchema,
} from './schemas/lifecycle-transition.schema';
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
import { TransitionsService } from './transitions.service';
import { TransitionsController } from './transitions.controller';
import { OrganizationModule } from '../../organization/organization.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LifecycleTransition.name, schema: LifecycleTransitionSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [TransitionsController],
  providers: [TransitionsService],
  exports: [TransitionsService],
})
export class TransitionsModule {}
