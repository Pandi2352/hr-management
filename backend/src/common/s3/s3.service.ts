import { Injectable, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { S3ConfigOptions, S3UploadOptions, S3UploadResult } from './s3.config';
import { LoggerHelper } from '../logger';

@Injectable()
export class S3Service {
  private readonly logger = LoggerHelper.Instance.child(S3Service.name);

  /**
   * Instantiates an AWS S3Client from dynamic configuration options.
   */
  createClient(config: S3ConfigOptions): S3Client {
    const clientConfig: any = {
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId?.trim(),
        secretAccessKey: config.secretAccessKey?.trim(),
      },
    };

    if (config.endpoint && config.endpoint.trim()) {
      clientConfig.endpoint = config.endpoint.trim();
    }

    if (config.forcePathStyle !== undefined) {
      clientConfig.forcePathStyle = Boolean(config.forcePathStyle);
    }

    return new S3Client(clientConfig);
  }

  /**
   * Diagnostic verification: tests connection, credentials, and bucket accessibility.
   */
  async testConnection(config: S3ConfigOptions): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.bucket?.trim()) {
      throw new BadRequestException('S3 Bucket name is required for connection testing');
    }
    if (!config.accessKeyId?.trim() || !config.secretAccessKey?.trim()) {
      throw new BadRequestException('AWS Access Key ID and Secret Access Key are required');
    }

    const client = this.createClient(config);
    const bucket = config.bucket.trim();

    try {
      // 1. First attempt HeadBucket to verify bucket existence and permissions
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch (headErr: any) {
        // Fallback: Some IAM roles allow ListBucket without HeadBucket
        await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
      }

      this.logger.info(null, `S3 Bucket verification successful: ${bucket}`, {
        region: config.region,
        endpoint: config.endpoint || 'AWS Standard',
      });

      return {
        success: true,
        message: `Successfully connected to S3 Bucket "${bucket}" in region "${config.region || 'us-east-1'}"!`,
        details: {
          bucket,
          region: config.region || 'us-east-1',
          endpoint: config.endpoint || 'https://s3.' + (config.region || 'us-east-1') + '.amazonaws.com',
          verifiedAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      this.logger.error(null, `S3 Verification Failed for bucket "${bucket}"`, err);
      const msg = err.message || 'Failed to authenticate with S3 bucket';
      throw new BadRequestException(`S3 Connection Error: ${msg}. Please check bucket name, region, and IAM keys.`);
    }
  }

  /**
   * Uploads a file buffer to S3.
   */
  async uploadFile(config: S3ConfigOptions, options: S3UploadOptions): Promise<S3UploadResult> {
    const client = this.createClient(config);
    const bucket = config.bucket.trim();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });

    const response = await client.send(command);

    let location = '';
    if (config.publicUrlBase) {
      location = `${config.publicUrlBase.replace(/\/+$/, '')}/${options.key}`;
    } else if (config.endpoint) {
      location = `${config.endpoint.replace(/\/+$/, '')}/${bucket}/${options.key}`;
    } else {
      location = `https://${bucket}.s3.${config.region || 'us-east-1'}.amazonaws.com/${options.key}`;
    }

    return {
      key: options.key,
      bucket,
      location,
      eTag: response.ETag,
    };
  }

  /**
   * Deletes an object from S3.
   */
  async deleteFile(config: S3ConfigOptions, key: string): Promise<void> {
    const client = this.createClient(config);
    const bucket = config.bucket.trim();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }
}
