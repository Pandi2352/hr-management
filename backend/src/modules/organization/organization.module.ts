import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Designation, DesignationSchema } from './schemas/designation.schema';
import { Location, LocationSchema } from './schemas/location.schema';
import { CostCenter, CostCenterSchema } from './schemas/cost-center.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
      { name: Location.name, schema: LocationSchema },
      { name: CostCenter.name, schema: CostCenterSchema },
      // Schema-only registration (not EmployeesModule) — the department delete
      // guard needs to count employees without creating a module cycle.
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
