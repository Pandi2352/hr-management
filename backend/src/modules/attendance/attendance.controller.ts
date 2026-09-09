import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { AttendanceService } from './attendance.service';
import { PunchDto } from './dto/attendance.dto';
import { OrganizationService } from '../organization/organization.service';
import { ResultEntity } from '../../common/response';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) return req.user.organizationId;
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  @Post('check-in')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async checkIn(@Request() req: any, @Body() dto: PunchDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.attendanceService.checkIn(dto, orgId, req.user);
    return ResultEntity.created(data, 'Punched in successfully');
  }

  @Post('check-out')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async checkOut(@Request() req: any, @Body() dto: PunchDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.attendanceService.checkOut(dto, orgId, req.user);
    return ResultEntity.ok(data, 'Punched out successfully');
  }

  @Get('today')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async today(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.attendanceService.todayStatus(orgId, req.user);
    return ResultEntity.ok(data);
  }

  @Get('me')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async myRecords(@Request() req: any, @Query('month') month?: string) {
    const orgId = await this.getOrgId(req);
    const fallback = new Date().toISOString().slice(0, 7);
    const data = await this.attendanceService.myRecords(orgId, req.user, month || fallback);
    return ResultEntity.ok(data);
  }

  @Get('overview')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async getOverview(@Request() req: any, @Query('year') year?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.attendanceService.getAttendanceOverview(orgId, year);
    return ResultEntity.ok(data);
  }

  @Get('sheet')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async getSheet(
    @Request() req: any,
    @Query('month') month?: string,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
    @Query('workType') workType?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.attendanceService.getAttendanceSheet(orgId, month, {
      departmentId,
      search,
      workType,
    });
    return ResultEntity.ok(data);
  }

  @Post('record')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  async recordManual(@Request() req: any, @Body() dto: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.attendanceService.recordManualAttendance(orgId, req.user, dto);
    return ResultEntity.ok(data, 'Attendance record updated successfully');
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  async teamRecords(
    @Request() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.attendanceService.teamRecords(orgId, { employeeId, from, to });
    return ResultEntity.ok(data);
  }
}
