import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceRecord, AttendanceRecordSchema } from './schemas/attendance-record.schema';
import { Shift, ShiftSchema } from './schemas/shift.schema';
import { Regularization, RegularizationSchema } from './schemas/regularization.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Organization, OrganizationSchema } from '../organization/schemas/organization.schema';
import { OrganizationModule } from '../organization/organization.module';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { ShiftService } from './shift.service';
import { RegularizationService } from './regularization.service';
import { ShiftsController } from './shifts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Regularization.name, schema: RegularizationSchema },
      // Schema-only registration (no module cycle) for self-service lookup.
      { name: Employee.name, schema: EmployeeSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [AttendanceController, ShiftsController],
  providers: [AttendanceService, ShiftService, RegularizationService],
  exports: [AttendanceService, ShiftService, RegularizationService],
})
export class AttendanceModule {}
