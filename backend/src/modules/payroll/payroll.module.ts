import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollRecord, PayrollRecordSchema } from './schemas/payroll-record.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Department, DepartmentSchema } from '../organization/schemas/department.schema';
import { Designation, DesignationSchema } from '../organization/schemas/designation.schema';
import { OrganizationModule } from '../organization/organization.module';
import { MailModule } from '../mail/mail.module';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollRecord.name, schema: PayrollRecordSchema },
      // Schema-only registrations: payroll reads employee and org reference data
      // without importing EmployeesModule, which would create a cycle.
      { name: Employee.name, schema: EmployeeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Designation.name, schema: DesignationSchema },
    ]),
    OrganizationModule,
    MailModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
