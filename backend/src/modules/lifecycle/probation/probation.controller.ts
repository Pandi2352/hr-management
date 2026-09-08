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
import { ProbationService } from './probation.service';
import { OrganizationService } from '../../organization/organization.service';
import {
  QueryProbationDto,
  EvaluateProbationDto,
  SignoffProbationDto,
} from './dto/probation.dto';
import { ResultEntity } from '../../../common/response';

@ApiTags('Lifecycle - Probation')
@ApiBearerAuth()
@Controller('lifecycle/probation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProbationController {
  constructor(
    private readonly probationService: ProbationService,
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
  @ApiOperation({ summary: 'List probationers with metrics and urgency filters' })
  async listProbations(@Request() req: any, @Query() query: QueryProbationDto) {
    const orgId = await this.getOrgId(req);
    const res = await this.probationService.listProbations(orgId, query);
    return ResultEntity.ok(res.data, 'Probation records retrieved successfully', {
      metrics: res.metrics,
      total: res.total,
      page: res.page,
      pageSize: res.pageSize,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single probation review details' })
  async getProbationById(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.probationService.getProbationById(orgId, id);
    return ResultEntity.ok(data, 'Probation review retrieved successfully');
  }

  @Post(':id/evaluate')
  @ApiOperation({ summary: 'Manager submit evaluation and recommendation' })
  async evaluateProbation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: EvaluateProbationDto,
  ) {
    const orgId = await this.getOrgId(req);
    const evaluatorId = req.user?.id || req.user?._id || 'manager-evaluator';
    const data = await this.probationService.evaluateProbation(orgId, id, evaluatorId, dto);
    return ResultEntity.ok(data, 'Probation evaluation submitted successfully');
  }

  @Post(':id/signoff')
  @ApiOperation({ summary: 'HR finalize probation: confirm, extend, or terminate' })
  async signoffProbation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SignoffProbationDto,
  ) {
    const orgId = await this.getOrgId(req);
    const signerId = req.user?.id || req.user?._id || 'hr-admin';
    const data = await this.probationService.signoffProbation(orgId, id, signerId, dto);
    return ResultEntity.ok(data, 'Probation review finalized successfully');
  }
}
