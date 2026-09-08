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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { TransitionsService } from './transitions.service';
import { OrganizationService } from '../../organization/organization.service';
import { CreateTransitionDto, QueryTransitionDto } from './dto/transition.dto';
import { ResultEntity } from '../../../common/response';

@ApiTags('Lifecycle - Transitions')
@ApiBearerAuth()
@Controller('lifecycle/transitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransitionsController {
  constructor(
    private readonly transitionsService: TransitionsService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) {
      return req.user.organizationId;
    }
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg?._id || 'default-org';
  }

  @Get()
  @ApiOperation({ summary: 'List promotions, transfers, and manager movements' })
  async listTransitions(@Request() req: any, @Query() query: QueryTransitionDto) {
    const orgId = await this.getOrgId(req);
    const res = await this.transitionsService.listTransitions(orgId, query);
    return ResultEntity.ok(res.data, 'Transitions retrieved successfully', {
      metrics: res.metrics,
      total: res.total,
      page: res.page,
      pageSize: res.pageSize,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Initiate a promotion, department transfer, or role change' })
  async createTransition(@Request() req: any, @Body() dto: CreateTransitionDto) {
    const orgId = await this.getOrgId(req);
    const initiatedBy = req.user?.id || req.user?._id || 'hr-admin';
    const data = await this.transitionsService.createTransition(orgId, initiatedBy, dto);
    return ResultEntity.ok(data, 'Lifecycle transition initiated successfully');
  }

  @Get('timeline/:employeeId')
  @ApiOperation({ summary: 'Get consolidated milestone timeline for an employee' })
  async getEmployeeTimeline(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.transitionsService.getEmployeeTimeline(orgId, employeeId);
    return ResultEntity.ok(data, 'Employee lifecycle timeline retrieved successfully');
  }
}
