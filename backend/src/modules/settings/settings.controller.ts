import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { ResultEntity } from '../../common/response';
import { SettingsService } from './settings.service';
import {
  UpdateSmtpSettingsDto,
  TestSmtpDto,
  UpdateS3SettingsDto,
  TestS3SettingsDto,
  UpdateBusinessSettingsDto,
} from './dto/business-settings.dto';

@ApiTags('Business Settings')
@Controller('business-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  private getOrgId(req: any): string {
    return req.user?.organizationId || 'default';
  }

  private getUserId(req: any): string {
    return req.user?.userId || req.user?.email || 'admin';
  }

  // ============================================================================
  // UNIFIED SETTINGS (smtp: {}, s3_config: {})
  // ============================================================================

  @Get()
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  @ApiOperation({ summary: 'Get all business settings (SMTP + S3 storage configuration)' })
  async getAllSettings(@Request() req: any): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const result = await this.settingsService.getAllBusinessSettings(orgId);
    return ResultEntity.ok(result);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  @ApiOperation({ summary: 'Update business settings (smtp: {}, s3_config: {})' })
  async updateAllSettings(
    @Request() req: any,
    @Body() dto: UpdateBusinessSettingsDto,
  ): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);
    const result = await this.settingsService.updateBusinessSettings(orgId, dto, userId);
    return ResultEntity.ok(result, 'Business settings updated successfully');
  }

  // ============================================================================
  // SMTP GATEWAY ENDPOINTS
  // ============================================================================

  @Get('smtp')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  @ApiOperation({ summary: 'Get current SMTP mail gateway settings (masked password)' })
  async getSmtpSettings(@Request() req: any): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const result = await this.settingsService.getSmtpSettings(orgId);
    return ResultEntity.ok(result);
  }

  @Put('smtp')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  @ApiOperation({ summary: 'Update SMTP mail gateway credentials' })
  async updateSmtpSettings(
    @Request() req: any,
    @Body() dto: UpdateSmtpSettingsDto,
  ): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);
    const result = await this.settingsService.updateSmtpSettings(orgId, dto, userId);
    return ResultEntity.ok(result, 'SMTP settings updated successfully');
  }

  @Post('smtp/test')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  @ApiOperation({ summary: 'Verify connection and send diagnostic test email' })
  async testSmtpConnection(
    @Request() req: any,
    @Body() dto: TestSmtpDto,
  ): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const result = await this.settingsService.testSmtpConnection(orgId, dto);
    return ResultEntity.ok(result.diagnostic, result.message);
  }

  // ============================================================================
  // S3 CLOUD STORAGE ENDPOINTS
  // ============================================================================

  @Get('s3')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  @ApiOperation({ summary: 'Get S3 cloud storage configuration (masked secret key)' })
  async getS3Settings(@Request() req: any): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const result = await this.settingsService.getS3Settings(orgId);
    return ResultEntity.ok(result);
  }

  @Put('s3')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  @ApiOperation({ summary: 'Update S3 cloud storage credentials & bucket settings' })
  async updateS3Settings(
    @Request() req: any,
    @Body() dto: UpdateS3SettingsDto,
  ): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);
    const result = await this.settingsService.updateS3Settings(orgId, dto, userId);
    return ResultEntity.ok(result, 'S3 storage configuration updated successfully');
  }

  @Post('s3/test')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  @ApiOperation({ summary: 'Verify S3 bucket credentials, connectivity, and permissions' })
  async testS3Connection(
    @Request() req: any,
    @Body() dto: TestS3SettingsDto,
  ): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const result = await this.settingsService.testS3Connection(orgId, dto);
    return ResultEntity.ok(result.details, result.message);
  }

  // ============================================================================
  // MINIO STORAGE ENDPOINTS
  // ============================================================================

  @Get('minio/template')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  @ApiOperation({ summary: 'Get MinIO recommended preset template defaults' })
  getMinioTemplate(): ResultEntity {
    return ResultEntity.ok(this.settingsService.getMinioTemplate());
  }

  @Post('minio')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  @ApiOperation({ summary: 'Configure self-hosted MinIO object storage' })
  async configureMinio(
    @Request() req: any,
    @Body() dto: UpdateS3SettingsDto,
  ): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);
    const result = await this.settingsService.configureMinio(orgId, dto, userId);
    return ResultEntity.ok(result, 'MinIO object storage configured successfully');
  }

  @Post('minio/test')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  @ApiOperation({ summary: 'Test MinIO endpoint and bucket accessibility' })
  async testMinioConnection(
    @Request() req: any,
    @Body() dto: TestS3SettingsDto,
  ): Promise<ResultEntity> {
    const orgId = this.getOrgId(req);
    const result = await this.settingsService.testMinioConnection(orgId, dto);
    return ResultEntity.ok(result.details, result.message);
  }
}
