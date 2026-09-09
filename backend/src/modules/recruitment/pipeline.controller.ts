import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { PipelineService } from './pipeline.service';
import { OrganizationService } from '../organization/organization.service';
import {
  MoveStageDto,
  ScheduleInterviewDto,
  UpdateInterviewDto,
  InterviewFeedbackDto,
  CreateOfferDto,
  UpdateOfferDto,
  OfferDecisionDto,
  HireCandidateDto,
} from './dto/recruitment.dto';
import { ResultEntity } from '../../common/response';

@ApiTags('Recruitment Pipeline')
@Controller('recruitment/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
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

  private actorName(req: any): string {
    return req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email : 'Reviewer';
  }

  @Get('pipeline')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  @ApiOperation({ summary: 'Funnel counts plus upcoming interviews' })
  async pipelineStats() {
    const data = await this.pipelineService.pipelineStats();
    return ResultEntity.ok(data);
  }

  @Get('applications/:id')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  @ApiOperation({ summary: 'Candidate detail with interviews and offer' })
  async applicationDetail(@Param('id') id: string) {
    const data = await this.pipelineService.getApplicationDetail(id);
    return ResultEntity.ok(data);
  }

  @Post('applications/:id/move')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Move a candidate to the next pipeline stage' })
  async moveStage(@Request() req: any, @Param('id') id: string, @Body() dto: MoveStageDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.moveStage(id, dto.to, dto.note?.trim() || '', orgId, this.actorId(req));
    return ResultEntity.ok(data, `Candidate moved to ${dto.to.toLowerCase()}`);
  }

  @Post('applications/:id/interviews')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Schedule an interview round' })
  async scheduleInterview(@Request() req: any, @Param('id') id: string, @Body() dto: ScheduleInterviewDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.scheduleInterview(id, dto, orgId, this.actorId(req));
    return ResultEntity.created(data, 'Interview scheduled');
  }

  @Get('applications/:id/interviews')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  @ApiOperation({ summary: 'List interview rounds for a candidate' })
  async listInterviews(@Param('id') id: string) {
    const data = await this.pipelineService.listInterviews(id);
    return ResultEntity.ok(data);
  }

  @Patch('interviews/:id')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Reschedule or cancel an interview' })
  async updateInterview(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.updateInterview(id, dto, orgId, this.actorId(req));
    return ResultEntity.ok(data, 'Interview updated');
  }

  @Post('interviews/:id/feedback')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Submit interview scorecard feedback' })
  async submitFeedback(@Request() req: any, @Param('id') id: string, @Body() dto: InterviewFeedbackDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.submitFeedback(id, dto, orgId, this.actorId(req), this.actorName(req));
    return ResultEntity.ok(data, 'Feedback recorded');
  }

  @Post('applications/:id/offer')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Create and send an offer' })
  async createOffer(@Request() req: any, @Param('id') id: string, @Body() dto: CreateOfferDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.createOffer(id, dto, orgId, this.actorId(req));
    return ResultEntity.created(data, 'Offer sent to candidate');
  }

  @Patch('offers/:id')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Edit a draft/sent offer' })
  async updateOffer(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateOfferDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.updateOffer(id, dto, orgId, this.actorId(req));
    return ResultEntity.ok(data, 'Offer updated');
  }

  @Post('offers/:id/decision')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Record the candidate decision on an offer' })
  async decideOffer(@Request() req: any, @Param('id') id: string, @Body() dto: OfferDecisionDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.decideOffer(id, dto.decision, orgId, this.actorId(req));
    return ResultEntity.ok(data, `Offer ${dto.decision.toLowerCase()}`);
  }

  @Post('applications/:id/hire')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Hire: convert the candidate into an employee (onboarding handoff)' })
  async hire(@Request() req: any, @Param('id') id: string, @Body() dto: HireCandidateDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.pipelineService.hire(id, dto, orgId, this.actorId(req));
    return ResultEntity.created(data, `Hired as ${data.employeeCode} — onboarding dispatched`);
  }
}
