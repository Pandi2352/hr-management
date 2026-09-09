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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { ShiftService } from './shift.service';
import { RegularizationService } from './regularization.service';
import { CreateShiftDto, UpdateShiftDto, RaiseRegularizationDto, DecideRegularizationDto } from './dto/shift.dto';
import { OrganizationService } from '../organization/organization.service';
import { ResultEntity } from '../../common/response';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShiftsController {
  constructor(
    private readonly shiftService: ShiftService,
    private readonly regularizationService: RegularizationService,
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

  // ------------------------------------------------------------------- shifts

  @Get('shifts')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async listShifts(@Request() req: any, @Query('status') status?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.shiftService.listShifts(orgId, status);
    return ResultEntity.ok(data);
  }

  @Post('shifts')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  async createShift(@Request() req: any, @Body() dto: CreateShiftDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.shiftService.createShift(dto, orgId, this.actorId(req));
    return ResultEntity.created(data, 'Shift created successfully');
  }

  @Patch('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  async updateShift(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateShiftDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.shiftService.updateShift(id, dto, orgId, this.actorId(req));
    return ResultEntity.ok(data, 'Shift updated successfully');
  }

  @Patch('shifts/:id/status')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  async toggleShiftStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.shiftService.toggleShiftStatus(id, orgId, this.actorId(req));
    return ResultEntity.ok(data, `Shift marked as ${data!.status.toLowerCase()}`);
  }

  @Delete('shifts/:id')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_MANAGE)
  async deleteShift(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.shiftService.deleteShift(id, orgId, this.actorId(req));
    return ResultEntity.ok(null, result.message);
  }

  // ---------------------------------------------------------- regularizations

  @Post('regularizations')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async raise(@Request() req: any, @Body() dto: RaiseRegularizationDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.regularizationService.raise(dto, orgId, req.user);
    return ResultEntity.created(data, 'Regularization sent to your manager');
  }

  @Get('regularizations/me')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async myRequests(@Request() req: any, @Query('status') status?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.regularizationService.myRequests(orgId, req.user, status);
    return ResultEntity.ok(data);
  }

  @Get('regularizations/inbox')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async inbox(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.regularizationService.inbox(orgId, req.user);
    return ResultEntity.ok(data);
  }

  @Post('regularizations/:id/approve')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async approve(@Request() req: any, @Param('id') id: string, @Body() dto: DecideRegularizationDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.regularizationService.decide(id, true, dto.note || '', orgId, req.user);
    return ResultEntity.ok(data, 'Regularization approved and applied');
  }

  @Post('regularizations/:id/reject')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async reject(@Request() req: any, @Param('id') id: string, @Body() dto: DecideRegularizationDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.regularizationService.decide(id, false, dto.note || '', orgId, req.user);
    return ResultEntity.ok(data, 'Regularization rejected');
  }

  @Post('regularizations/:id/cancel')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async cancel(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.regularizationService.cancel(id, orgId, req.user);
    return ResultEntity.ok(data, 'Regularization cancelled');
  }
}
