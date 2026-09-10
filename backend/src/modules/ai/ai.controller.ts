import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { AiService } from './ai.service';
import { OrganizationService } from '../organization/organization.service';
import { SaveProviderSettingsDto, TestPromptDto } from './dto/ai.dto';
import type { AiProviderId } from './config/ai.config';
import { ResultEntity } from '../../common/response';

@ApiTags('AI Providers')
@Controller('ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly orgService: OrganizationService,
  ) {}

  /**
   * The organization to read and write settings for.
   *
   * Settings are stored per organization, so a request without one has nowhere
   * to put them. Refusing is better than falling back to a shared bucket that
   * would let one tenant's key serve another's requests.
   */
  private async requireOrgId(req: any): Promise<string> {
    const orgId = await this.getOrgId(req);
    if (!orgId) {
      throw new BadRequestException('No organization on this request, so AI settings cannot be resolved.');
    }
    return orgId;
  }

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
  async listProviders(@Request() req: any) {
    const orgId = await this.requireOrgId(req);
    const providers = await this.aiService.listProviders(orgId);
    return ResultEntity.ok({
      enabled: this.aiService.isEnabled(),
      canStoreKeys: this.aiService.canStoreKeys(),
      providers,
    });
  }

  @Post('providers/:id/test')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Live connectivity test for one provider' })
  async testProvider(@Request() req: any, @Param('id') id: AiProviderId) {
    const orgId = await this.requireOrgId(req);
    const data = await this.aiService.testProvider(id, orgId);
    return ResultEntity.ok(data, data.ok ? 'Connection test passed' : 'Connection test failed');
  }

  /**
   * Saves credentials typed into the settings page.
   *
   * The key travels in the request body over the same channel as every other
   * write and is encrypted before it touches the database. It is never sent
   * back: subsequent reads return a masked form only.
   */
  @Put('providers/:id/settings')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Save API key, model and host for one provider' })
  async saveProviderSettings(
    @Request() req: any,
    @Param('id') id: AiProviderId,
    @Body() dto: SaveProviderSettingsDto,
  ) {
    const orgId = await this.requireOrgId(req);
    const actorId = req.user?.userId || req.user?.id;
    const providers = await this.aiService.saveProviderSettings(orgId, id, dto, actorId);
    return ResultEntity.ok(
      { enabled: this.aiService.isEnabled(), canStoreKeys: this.aiService.canStoreKeys(), providers },
      'Provider settings saved',
    );
  }

  @Delete('providers/:id/settings')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Remove saved settings, returning the provider to environment defaults' })
  async clearProviderSettings(@Request() req: any, @Param('id') id: AiProviderId) {
    const orgId = await this.requireOrgId(req);
    const actorId = req.user?.userId || req.user?.id;
    const providers = await this.aiService.clearProviderSettings(orgId, id, actorId);
    return ResultEntity.ok(
      { enabled: this.aiService.isEnabled(), canStoreKeys: this.aiService.canStoreKeys(), providers },
      'Provider settings cleared',
    );
  }

  @Post('providers/:id/set-default')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Set a provider as the default for the organization' })
  async setDefaultProvider(@Request() req: any, @Param('id') id: AiProviderId) {
    const orgId = await this.requireOrgId(req);
    const actorId = req.user?.userId || req.user?.id;
    const providers = await this.aiService.setDefaultProvider(orgId, id, actorId);
    return ResultEntity.ok(
      { enabled: this.aiService.isEnabled(), canStoreKeys: this.aiService.canStoreKeys(), providers },
      'Default provider updated',
    );
  }

  @Post('providers/:id/test-prompt')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Send a live test prompt to verify generation & latency' })
  async testPrompt(
    @Request() req: any,
    @Param('id') id: AiProviderId,
    @Body() dto: TestPromptDto,
  ) {
    const orgId = await this.requireOrgId(req);
    const result = await this.aiService.testPrompt(id, orgId, dto.prompt);
    return ResultEntity.ok(result, 'Test prompt generation completed');
  }
}
