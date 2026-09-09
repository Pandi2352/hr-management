import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS, UserRole } from '../../common/constants';
import { LeaveService } from './leave.service';
import {
  CreateHolidayDto,
  UpdateHolidayDto,
  UpdateHolidayCalendarDto,
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  AssignBalanceDto,
  SeedYearDto,
  ApplyDefaultsDto,
  AvailRestrictedHolidayDto,
} from './dto/leave.dto';
import { OrganizationService } from '../organization/organization.service';
import { ResultEntity } from '../../common/response';

@Controller('leave')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) return req.user.organizationId;
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  private actorId(req: any): string {
    return req.user?.userId || req.user?.id;
  }

  private isHr(req: any): boolean {
    const roles: string[] = req.user?.roles || [];
    const perms: string[] = req.user?.permissions || [];
    if (perms.includes('*')) return true;
    const upper = roles.map((r) => String(r).toUpperCase());
    return (
      upper.includes(UserRole.SUPER_ADMIN) ||
      upper.includes(UserRole.HR_ADMIN) ||
      perms.includes(PERMISSIONS.LEAVE_MANAGE)
    );
  }

  // ------------------------------------------------------------- holidays

  @Get('holidays')
  @RequirePermissions(PERMISSIONS.HOLIDAY_READ)
  async listHolidays(
    @Request() req: any,
    @Query('year') year?: number,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.listHolidays(orgId, { year, type, search, status });
    return ResultEntity.ok(data);
  }

  /** Calendar + fixed/restricted lists + the caller's availed restricted picks. */
  @Get('holidays/calendar')
  @RequirePermissions(PERMISSIONS.HOLIDAY_READ)
  async getCalendarView(@Request() req: any, @Query('year') year?: number) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.listHolidaysWithOpts(orgId, req.user, Number(year) || new Date().getFullYear());
    return ResultEntity.ok(data);
  }

  @Post('holidays')
  @RequirePermissions(PERMISSIONS.HOLIDAY_MANAGE)
  async createHoliday(@Request() req: any, @Body() dto: CreateHolidayDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.createHoliday(dto, orgId, this.actorId(req));
    return ResultEntity.created(data, 'Holiday added successfully');
  }

  @Patch('holidays/:id')
  @RequirePermissions(PERMISSIONS.HOLIDAY_MANAGE)
  async updateHoliday(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.updateHoliday(id, dto, orgId, this.actorId(req));
    return ResultEntity.ok(data, 'Holiday updated successfully');
  }

  @Patch('holidays/:id/status')
  @RequirePermissions(PERMISSIONS.HOLIDAY_MANAGE)
  async toggleHolidayStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.toggleHolidayStatus(id, orgId, this.actorId(req));
    return ResultEntity.ok(data, `Holiday marked as ${data!.status.toLowerCase()}`);
  }

  @Delete('holidays/:id')
  @RequirePermissions(PERMISSIONS.HOLIDAY_MANAGE)
  async deleteHoliday(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.leaveService.deleteHoliday(id, orgId, this.actorId(req));
    return ResultEntity.ok(null, result.message);
  }

  @Get('holiday-calendars/:year')
  @RequirePermissions(PERMISSIONS.HOLIDAY_READ)
  async getCalendar(@Request() req: any, @Param('year') year: number) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.getCalendar(orgId, Number(year));
    return ResultEntity.ok(data);
  }

  @Patch('holiday-calendars/:year')
  @RequirePermissions(PERMISSIONS.HOLIDAY_MANAGE)
  async updateCalendar(
    @Request() req: any,
    @Param('year') year: number,
    @Body() dto: UpdateHolidayCalendarDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.updateCalendar(Number(year), dto, orgId, this.actorId(req));
    return ResultEntity.ok(data, `Holiday calendar ${year} updated successfully`);
  }

  // ------------------------------------------------------------ leave types

  @Get('types')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async listLeaveTypes(@Request() req: any, @Query('status') status?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.listLeaveTypes(orgId, status);
    return ResultEntity.ok(data);
  }

  @Post('types')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async createLeaveType(@Request() req: any, @Body() dto: CreateLeaveTypeDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.createLeaveType(dto, orgId, this.actorId(req));
    return ResultEntity.created(data, 'Leave type created successfully');
  }

  @Patch('types/:id')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async updateLeaveType(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.updateLeaveType(id, dto, orgId, this.actorId(req));
    return ResultEntity.ok(data, 'Leave type updated successfully');
  }

  @Patch('types/:id/status')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async toggleLeaveTypeStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.toggleLeaveTypeStatus(id, orgId, this.actorId(req));
    return ResultEntity.ok(data, `Leave type marked as ${data!.status.toLowerCase()}`);
  }

  // --------------------------------------------------------------- balances

  @Get('balances/me')
  async getMyBalances(@Request() req: any, @Query('year') year?: number) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.getMyBalances(orgId, req.user, Number(year) || new Date().getFullYear());
    return ResultEntity.ok(data);
  }

  @Get('balances')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async listBalances(
    @Request() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: number,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.listBalances(orgId, { employeeId, year, leaveTypeId });
    return ResultEntity.ok(data);
  }

  @Post('balances/assign')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async assignBalance(@Request() req: any, @Body() dto: AssignBalanceDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.assignBalance(dto, orgId, this.actorId(req));
    return ResultEntity.ok(data, 'Leave balance saved successfully');
  }

  @Post('balances/seed-year')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async seedYearBalances(@Request() req: any, @Body() dto: SeedYearDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.seedYearBalances(dto.year, orgId, this.actorId(req));
    return ResultEntity.ok(data, `Leave balances seeded for ${dto.year}`);
  }

  @Post('balances/apply-defaults')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async applyDefaultsToAll(@Request() req: any, @Body() dto: ApplyDefaultsDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.applyDefaultsToAll(dto.year, orgId, this.actorId(req), dto.overwrite ?? false);
    return ResultEntity.ok(data, `Default balances applied to all employees for ${dto.year}`);
  }

  // ------------------------------------------------- restricted holiday opts

  @Post('restricted-opts')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async availRestrictedHoliday(@Request() req: any, @Body() dto: AvailRestrictedHolidayDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.leaveService.availRestrictedHoliday(dto.holidayId, orgId, req.user);
    return ResultEntity.created(data, 'Restricted holiday availed');
  }

  @Delete('restricted-opts/:id')
  async cancelRestrictedHoliday(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    if (!this.isHr(req) && !(req.user?.permissions || []).includes(PERMISSIONS.LEAVE_READ)) {
      throw new ForbiddenException('Insufficient permissions to perform this action');
    }
    const data = await this.leaveService.cancelRestrictedHoliday(id, orgId, req.user, this.isHr(req));
    return ResultEntity.ok(null, data.message);
  }
}
