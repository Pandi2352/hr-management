import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AtriumProfile, AtriumProfileSchema } from './schemas/atrium-profile.schema';
import { AtriumFollow, AtriumFollowSchema } from './schemas/atrium-follow.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Department, DepartmentSchema } from '../organization/schemas/department.schema';
import { Designation, DesignationSchema } from '../organization/schemas/designation.schema';
import { OrganizationModule } from '../organization/organization.module';
import { AtriumProfileService } from './atrium-profile.service';
import { AtriumFollowService } from './atrium-follow.service';
import { AtriumController } from './atrium.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AtriumProfile.name, schema: AtriumProfileSchema },
      { name: AtriumFollow.name, schema: AtriumFollowSchema },
      // Schema-only registration: Atrium reads employee and org reference data
      // to build profiles, without importing EmployeesModule and creating a cycle.
      { name: Employee.name, schema: EmployeeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [AtriumController],
  providers: [AtriumProfileService, AtriumFollowService],
  exports: [AtriumProfileService, AtriumFollowService],
})
export class AtriumModule {}
