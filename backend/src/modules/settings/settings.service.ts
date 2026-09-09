import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusinessSetting, BusinessSettingDocument } from './schemas/business-settings.schema';
import {
  UpdateSmtpSettingsDto,
  TestSmtpDto,
  UpdateS3SettingsDto,
  TestS3SettingsDto,
  UpdateBusinessSettingsDto,
} from './dto/business-settings.dto';
import { SmtpSettingsService } from './services/smtp-settings.service';
import { S3SettingsService } from './services/s3-settings.service';
import { MinioSettingsService } from './services/minio-settings.service';
import { S3ConfigOptions } from '../../common/s3/s3.config';
import { LoggerHelper } from '../../common/logger';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = LoggerHelper.Instance.child(SettingsService.name);

  constructor(
    @InjectModel(BusinessSetting.name)
    private readonly businessSettingModel: Model<BusinessSettingDocument>,
    private readonly smtpSettingsService: SmtpSettingsService,
    private readonly s3SettingsService: S3SettingsService,
    private readonly minioSettingsService: MinioSettingsService,
  ) {}

  async onModuleInit() {
    await this.ensureInitialSeed();
  }

  /**
   * Seeds initial SMTP and S3 credentials structure if no configuration exists.
   */
  async ensureInitialSeed(): Promise<void> {
    const existing = await this.businessSettingModel.findOne({ organizationId: 'default' });
    if (!existing) {
      await this.businessSettingModel.create({
        organizationId: 'default',
        smtp: {
          host: '',
          port: 587,
          user: '',
          pass: '',
          fromName: '',
          fromEmail: '',
          secure: false,
          isConfigured: false,
          lastVerifiedAt: null,
        },
        s3_config: {
          bucket: '',
          region: 'us-east-1',
          accessKeyId: '',
          secretAccessKey: '',
          endpoint: '',
          forcePathStyle: false,
          publicUrlBase: '',
          isConfigured: false,
          lastVerifiedAt: null,
        },
        updatedBy: 'Initial Setup',
      });
      this.logger.info(null, 'Initial business settings (SMTP + S3) seeded successfully');
    } else if (!existing.s3_config) {
      await this.businessSettingModel.updateOne(
        { organizationId: 'default' },
        {
          $set: {
            s3_config: {
              bucket: '',
              region: 'us-east-1',
              accessKeyId: '',
              secretAccessKey: '',
              endpoint: '',
              forcePathStyle: false,
              publicUrlBase: '',
              isConfigured: false,
              lastVerifiedAt: null,
            },
          },
        },
      );
    }
  }

  // ============================================================================
  // SMTP DELEGATION (smtp-settings.service.ts)
  // ============================================================================

  async getActiveSmtpConfig(orgId?: string) {
    return this.smtpSettingsService.getActiveSmtpConfig(orgId);
  }

  async getSmtpSettings(orgId?: string) {
    return this.smtpSettingsService.getSmtpSettings(orgId);
  }

  async updateSmtpSettings(orgId: string, dto: UpdateSmtpSettingsDto, userId: string) {
    return this.smtpSettingsService.updateSmtpSettings(orgId, dto, userId);
  }

  async testSmtpConnection(orgId: string, dto: TestSmtpDto) {
    return this.smtpSettingsService.testSmtpConnection(orgId, dto);
  }

  // ============================================================================
  // S3 STORAGE DELEGATION (s3-settings.service.ts)
  // ============================================================================

  async getActiveS3Config(orgId?: string): Promise<S3ConfigOptions> {
    return this.s3SettingsService.getActiveS3Config(orgId);
  }

  async getS3Settings(orgId?: string) {
    return this.s3SettingsService.getS3Settings(orgId);
  }

  async updateS3Settings(orgId: string, dto: UpdateS3SettingsDto, userId: string) {
    return this.s3SettingsService.updateS3Settings(orgId, dto, userId);
  }

  async testS3Connection(orgId: string, dto: TestS3SettingsDto) {
    return this.s3SettingsService.testS3Connection(orgId, dto);
  }

  // ============================================================================
  // MINIO STORAGE DELEGATION (minio-settings.service.ts)
  // ============================================================================

  getMinioTemplate() {
    return this.minioSettingsService.getMinioTemplate();
  }

  async configureMinio(orgId: string, dto: UpdateS3SettingsDto, userId: string) {
    return this.minioSettingsService.configureMinio(orgId, dto, userId);
  }

  async testMinioConnection(orgId: string, dto: TestS3SettingsDto) {
    return this.minioSettingsService.testMinioConnection(orgId, dto);
  }

  // ============================================================================
  // UNIFIED SETTINGS ORCHESTRATION ({ smtp: {}, s3_config: {} })
  // ============================================================================

  async getAllBusinessSettings(orgId?: string) {
    const targetOrgId = orgId || 'default';
    const [smtp, s3_config] = await Promise.all([
      this.getSmtpSettings(targetOrgId),
      this.getS3Settings(targetOrgId),
    ]);

    return {
      organizationId: targetOrgId,
      smtp,
      s3_config,
    };
  }

  async updateBusinessSettings(orgId: string, dto: UpdateBusinessSettingsDto, userId: string) {
    const targetOrgId = orgId || 'default';
    if (dto.smtp) {
      await this.updateSmtpSettings(targetOrgId, dto.smtp, userId);
    }
    if (dto.s3_config) {
      await this.updateS3Settings(targetOrgId, dto.s3_config, userId);
    }
    return this.getAllBusinessSettings(targetOrgId);
  }
}
