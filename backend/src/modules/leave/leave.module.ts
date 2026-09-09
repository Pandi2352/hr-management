import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Holiday, HolidaySchema } from './schemas/holiday.schema';
import { HolidayCalendar, HolidayCalendarSchema } from './schemas/holiday-calendar.schema';
import { LeaveType, LeaveTypeSchema } from './schemas/leave-type.schema';
import { LeaveBalance, LeaveBalanceSchema } from './schemas/leave-balance.schema';
import {
  RestrictedHolidayOpt,
  RestrictedHolidayOptSchema,
} from './schemas/restricted-holiday-opt.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Organization, OrganizationSchema } from '../organization/schemas/organization.schema';
import { OrganizationModule } from '../organization/organization.module';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Holiday.name, schema: HolidaySchema },
      { name: HolidayCalendar.name, schema: HolidayCalendarSchema },
      { name: LeaveType.name, schema: LeaveTypeSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: RestrictedHolidayOpt.name, schema: RestrictedHolidayOptSchema },
      // Schema-only registrations (no module cycle): employee lookup for
      // self-service resolution and org listing for first-boot seeding.
      { name: Employee.name, schema: EmployeeSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
