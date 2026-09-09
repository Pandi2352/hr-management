import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { OrganizationModule } from '../organization/organization.module';
import { Department, DepartmentSchema } from '../organization/schemas/department.schema';
import { Designation, DesignationSchema } from '../organization/schemas/designation.schema';
import { Location, LocationSchema } from '../organization/schemas/location.schema';
import { CostCenter, CostCenterSchema } from '../organization/schemas/cost-center.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Role, RoleSchema } from '../users/schemas/role.schema';

import { Organization, OrganizationSchema } from '../organization/schemas/organization.schema';
import { Shift, ShiftSchema } from '../attendance/schemas/shift.schema';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { EmployeeProvisioningService } from './employee-provisioning.service';
import { EmployeeScopeService } from './employee-scope.service';
import { DocumentStorageService } from './document-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
      { name: Location.name, schema: LocationSchema },
      { name: CostCenter.name, schema: CostCenterSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Organization.name, schema: OrganizationSchema },
      // Shift master lookup for the populated work schedule (no cycle:
      // the attendance module never imports the employees module).
      { name: Shift.name, schema: ShiftSchema },
    ]),
    OrganizationModule,
    MailModule,
    // Role assignment on an employee's login delegates to UsersService.
    // No cycle: UsersModule imports AuthModule + MailModule only.
    UsersModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeProvisioningService, EmployeeScopeService, DocumentStorageService],
  exports: [EmployeesService, EmployeeProvisioningService, EmployeeScopeService, DocumentStorageService],
})
export class EmployeesModule {}
