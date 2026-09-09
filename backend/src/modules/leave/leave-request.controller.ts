import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { LeaveRequestService } from './leave-request.service';
import { CreateLeaveRequestDto, DecideLeaveRequestDto } from './dto/leave-request.dto';
import { OrganizationService } from '../organization/organization.service';
import { ResultEntity } from '../../common/response';

@Controller('leave/requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveRequestController {
  constructor(
    private readonly requestService: LeaveRequestService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) return req.user.organizationId;
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  @Post()
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async apply(@Request() req: any, @Body() dto: CreateLeaveRequestDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.apply(dto, orgId, req.user);
    return ResultEntity.created(data, 'Leave request submitted for manager approval');
  }

  @Get('me')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async myRequests(@Request() req: any, @Query('status') status?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.myRequests(orgId, req.user, status);
    return ResultEntity.ok(data);
  }

  @Get('inbox')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async inbox(@Request() req: any, @Query('status') status?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.inbox(orgId, req.user, status);
    return ResultEntity.ok(data);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async allRequests(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.allRequests(orgId, { status, employeeId });
    return ResultEntity.ok(data);
  }

  @Post(':id/manager-approve')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async managerApprove(@Request() req: any, @Param('id') id: string, @Body() dto: DecideLeaveRequestDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.managerDecide(id, true, dto.comments || '', orgId, req.user);
    return ResultEntity.ok(data, 'Forwarded to HR for final approval');
  }

  @Post(':id/manager-reject')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async managerReject(@Request() req: any, @Param('id') id: string, @Body() dto: DecideLeaveRequestDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.managerDecide(id, false, dto.comments || '', orgId, req.user);
    return ResultEntity.ok(data, 'Leave request rejected and balance released');
  }

  @Post(':id/hr-approve')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async hrApprove(@Request() req: any, @Param('id') id: string, @Body() dto: DecideLeaveRequestDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.hrDecide(id, true, dto.comments || '', orgId, req.user);
    return ResultEntity.ok(data, 'Leave approved and balance deducted');
  }

  @Post(':id/hr-reject')
  @RequirePermissions(PERMISSIONS.LEAVE_MANAGE)
  async hrReject(@Request() req: any, @Param('id') id: string, @Body() dto: DecideLeaveRequestDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.hrDecide(id, false, dto.comments || '', orgId, req.user);
    return ResultEntity.ok(data, 'Leave request rejected and balance released');
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async cancel(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.requestService.cancel(id, orgId, req.user);
    return ResultEntity.ok(data, 'Leave request cancelled');
  }
}
