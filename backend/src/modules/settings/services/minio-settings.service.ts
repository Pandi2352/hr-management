import { Injectable, BadRequestException } from '@nestjs/common';
import { S3SettingsService } from './s3-settings.service';
import { S3Service } from '../../../common/s3/s3.service';
import { UpdateS3SettingsDto, TestS3SettingsDto } from '../dto/business-settings.dto';
import { LoggerHelper } from '../../../common/logger';

@Injectable()
export class MinioSettingsService {
  private readonly logger = LoggerHelper.Instance.child(MinioSettingsService.name);

  // Standard MinIO Defaults
  public static readonly DEFAULT_MINIO_ENDPOINT = 'http://localhost:9000';
  public static readonly DEFAULT_MINIO_REGION = 'us-east-1';

  constructor(
    private readonly s3SettingsService: S3SettingsService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Returns standard MinIO template options.
   */
  getMinioTemplate(): {
    endpoint: string;
    region: string;
    forcePathStyle: boolean;
    hint: string;
  } {
    return {
      endpoint: MinioSettingsService.DEFAULT_MINIO_ENDPOINT,
      region: MinioSettingsService.DEFAULT_MINIO_REGION,
      forcePathStyle: true,
      hint: 'Local / Self-hosted MinIO Object Storage with path-style addressing',
    };
  }

  /**
   * Updates S3 configuration with MinIO-specific rules (enforces forcePathStyle and validates endpoint).
   */
  async configureMinio(orgId: string, dto: UpdateS3SettingsDto, userId: string): Promise<any> {
    const endpoint = dto.endpoint?.trim() || MinioSettingsService.DEFAULT_MINIO_ENDPOINT;
    
    // MinIO strictly requires http:// or https:// prefix
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      throw new BadRequestException('MinIO endpoint must start with http:// or https:// (e.g. http://localhost:9000)');
    }

    const minioDto: UpdateS3SettingsDto = {
      ...dto,
      endpoint,
      region: dto.region?.trim() || MinioSettingsService.DEFAULT_MINIO_REGION,
      forcePathStyle: true, // Path-style is mandatory for MinIO
    };

    return this.s3SettingsService.updateS3Settings(orgId, minioDto, userId);
  }

  /**
   * Tests MinIO connectivity with detailed diagnostics tailored for self-hosted instances.
   */
  async testMinioConnection(orgId: string, dto: TestS3SettingsDto): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const endpoint = dto.endpoint?.trim() || MinioSettingsService.DEFAULT_MINIO_ENDPOINT;

    try {
      const result = await this.s3Service.testConnection({
        bucket: dto.bucket || '',
        region: dto.region || MinioSettingsService.DEFAULT_MINIO_REGION,
        accessKeyId: dto.accessKeyId || '',
        secretAccessKey: dto.secretAccessKey || '',
        endpoint,
        forcePathStyle: true,
      });

      return {
        success: true,
        message: `MinIO Storage verified successfully at ${endpoint}! Bucket "${dto.bucket}" is accessible.`,
        details: {
          provider: 'MinIO Object Storage',
          endpoint,
          bucket: dto.bucket,
          forcePathStyle: true,
          verifiedAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      this.logger.error(null, 'MinIO connection test failed', err);
      throw new BadRequestException(
        `MinIO Connection Error at ${endpoint}: ${err.message || 'Server unreachable'}. Verify MinIO server is running and root credentials are valid.`,
      );
    }
  }
}
