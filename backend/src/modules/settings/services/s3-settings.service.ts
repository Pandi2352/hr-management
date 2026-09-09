import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusinessSetting, BusinessSettingDocument } from '../schemas/business-settings.schema';
import { UpdateS3SettingsDto, TestS3SettingsDto } from '../dto/business-settings.dto';
import { S3Service } from '../../../common/s3/s3.service';
import { maskS3Secret, S3ConfigOptions } from '../../../common/s3/s3.config';
import { LoggerHelper } from '../../../common/logger';

@Injectable()
export class S3SettingsService {
  private readonly logger = LoggerHelper.Instance.child(S3SettingsService.name);

  constructor(
    @InjectModel(BusinessSetting.name)
    private readonly businessSettingModel: Model<BusinessSettingDocument>,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Internal getter: retrieves complete, unmasked S3 credentials for file vault operations.
   */
  async getActiveS3Config(orgId?: string): Promise<S3ConfigOptions> {
    let setting = null;
    if (orgId && orgId !== 'default') {
      setting = await this.businessSettingModel.findOne({ organizationId: orgId }).lean();
    }
    if (!setting || !setting.s3_config?.bucket) {
      setting = await this.businessSettingModel.findOne({ organizationId: 'default' }).lean();
    }

    const s = setting?.s3_config || ({} as any);
    return {
      bucket: s.bucket || '',
      region: s.region || 'us-east-1',
      accessKeyId: s.accessKeyId || '',
      secretAccessKey: s.secretAccessKey || '',
      endpoint: s.endpoint || '',
      forcePathStyle: Boolean(s.forcePathStyle),
      publicUrlBase: s.publicUrlBase || '',
      isConfigured: Boolean(s.isConfigured && s.bucket && s.accessKeyId && s.secretAccessKey),
      lastVerifiedAt: s.lastVerifiedAt || null,
    };
  }

  /**
   * UI-facing getter: returns S3 configuration with masked secret access key.
   */
  async getS3Settings(orgId?: string): Promise<any> {
    const config = await this.getActiveS3Config(orgId);
    return {
      bucket: config.bucket,
      region: config.region,
      accessKeyId: config.accessKeyId,
      maskedSecretAccessKey: maskS3Secret(config.secretAccessKey),
      hasSecretAccessKey: Boolean(config.secretAccessKey),
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      publicUrlBase: config.publicUrlBase,
      isConfigured: config.isConfigured,
      lastVerifiedAt: config.lastVerifiedAt,
    };
  }

  /**
   * Updates S3 cloud storage configuration in MongoDB.
   */
  async updateS3Settings(orgId: string, dto: UpdateS3SettingsDto, userId: string): Promise<any> {
    const targetOrgId = orgId || 'default';
    let record = await this.businessSettingModel.findOne({ organizationId: targetOrgId });
    if (!record && targetOrgId !== 'default') {
      record = await this.businessSettingModel.findOne({ organizationId: 'default' });
    }

    const existingSecret = record?.s3_config?.secretAccessKey || '';
    const newSecret = dto.secretAccessKey && dto.secretAccessKey.trim()
      ? dto.secretAccessKey.trim()
      : existingSecret;

    if (!dto.bucket?.trim()) {
      throw new BadRequestException('S3 Bucket name is required');
    }
    if (!dto.accessKeyId?.trim()) {
      throw new BadRequestException('AWS Access Key ID is required');
    }

    await this.businessSettingModel.findOneAndUpdate(
      { organizationId: targetOrgId },
      {
        $set: {
          's3_config.bucket': dto.bucket.trim(),
          's3_config.region': (dto.region || 'us-east-1').trim(),
          's3_config.accessKeyId': dto.accessKeyId.trim(),
          's3_config.secretAccessKey': newSecret,
          's3_config.endpoint': (dto.endpoint || '').trim(),
          's3_config.forcePathStyle': Boolean(dto.forcePathStyle),
          's3_config.publicUrlBase': (dto.publicUrlBase || '').trim(),
          's3_config.isConfigured': Boolean(dto.bucket && dto.accessKeyId && newSecret),
          updatedBy: userId,
        },
      },
      { new: true, upsert: true },
    );

    this.logger.info(null, `Updated S3 settings for org: ${targetOrgId}`, {
      bucket: dto.bucket,
      region: dto.region,
      endpoint: dto.endpoint,
    });

    return this.getS3Settings(targetOrgId);
  }

  /**
   * Tests S3 credentials and bucket connectivity using common S3Service.
   */
  async testS3Connection(orgId: string, dto: TestS3SettingsDto): Promise<{ success: boolean; message: string; details?: any }> {
    const active = await this.getActiveS3Config(orgId);

    const bucket = dto.bucket || active.bucket;
    const region = dto.region || active.region || 'us-east-1';
    const accessKeyId = dto.accessKeyId || active.accessKeyId;
    const secretAccessKey = dto.secretAccessKey && dto.secretAccessKey.trim()
      ? dto.secretAccessKey.trim()
      : active.secretAccessKey;
    const endpoint = dto.endpoint !== undefined ? dto.endpoint : active.endpoint;
    const forcePathStyle = dto.forcePathStyle !== undefined ? dto.forcePathStyle : active.forcePathStyle;

    const result = await this.s3Service.testConnection({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      endpoint,
      forcePathStyle,
    });

    await this.businessSettingModel.updateOne(
      { organizationId: orgId || 'default' },
      { $set: { 's3_config.lastVerifiedAt': new Date(), 's3_config.isConfigured': true } },
    );

    return result;
  }
}
