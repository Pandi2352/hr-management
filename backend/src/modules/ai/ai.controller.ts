import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { AiService } from './ai.service';
import { HrCopilotService } from './hr-copilot.service';
import { OrganizationService } from '../organization/organization.service';
import { ScoreCandidateDto, AskCopilotDto } from './dto/ai.dto';
import { ResultEntity } from '../../common/response';

@ApiTags('AI Providers & Shortlisting')
@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly copilotService: HrCopilotService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string | null> {
    if (req.user?.organizationId) return req.user.organizationId;
    try {
      const defaultOrg = await this.orgService.getProfile();
      return String(defaultOrg._id);
    } catch {
      return null;
    }
  }

  @Get('providers')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'List AI providers with configuration status (no secrets)' })
  async listProviders() {
    const data = this.aiService.listProviders();
    return ResultEntity.ok({ enabled: this.aiService.isEnabled(), providers: data });
  }

  @Post('providers/:id/test')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Live connectivity test for one provider' })
  async testProvider(@Param('id') id: 'openai' | 'opencode') {
    const data = await this.aiService.testProvider(id);
    return ResultEntity.ok(data, data.ok ? 'Connection test passed' : 'Connection test failed');
  }

  @Post('applications/:id/score')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Score a candidate for HR shortlisting via the selected provider' })
  async scoreCandidate(@Request() req: any, @Param('id') id: string, @Body() dto: ScoreCandidateDto) {
    const orgId = await this.getOrgId(req);
    const actorId = req.user?.userId || req.user?.id;
    const data = await this.aiService.scoreCandidate(id, dto.provider, orgId, actorId);
    return ResultEntity.ok(data, 'Candidate scored — review before shortlisting');
  }

  @Post('ask')
  @ApiOperation({ summary: 'AskHR Copilot: answer from your own live HR data' })
  async ask(@Request() req: any, @Body() dto: AskCopilotDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.copilotService.ask(dto.question, orgId || '', req.user);
    return ResultEntity.ok(data);
  }
}
