import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSmtpSettingsDto {
  @ApiProperty({ description: 'SMTP Host address (e.g. smtp.gmail.com)' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ description: 'SMTP Port (e.g. 587 for TLS, 465 for SSL)', default: 587 })
  @IsNumber()
  @IsNotEmpty()
  port: number;

  @ApiProperty({ description: 'SMTP Username / Login email address' })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiPropertyOptional({ description: 'SMTP Password or App Password. Leave empty if unchanged.' })
  @IsOptional()
  @IsString()
  pass?: string;

  @ApiPropertyOptional({ description: 'Sender Display Name (e.g. Acme Corp)' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Sender Email Address' })
  @IsOptional()
  @IsString()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'Use SSL/TLS secure connection', default: false })
  @IsOptional()
  @IsBoolean()
  secure?: boolean;
}

export class TestSmtpDto {
  @ApiProperty({ description: 'Recipient email address to receive the test verification email' })
  @IsEmail()
  @IsNotEmpty()
  toEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  secure?: boolean;
}

export class UpdateS3SettingsDto {
  @ApiProperty({ description: 'S3 Bucket Name' })
  @IsString()
  @IsNotEmpty()
  bucket: string;

  @ApiPropertyOptional({ description: 'AWS Region or custom region', default: 'us-east-1' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'AWS Access Key ID' })
  @IsString()
  @IsNotEmpty()
  accessKeyId: string;

  @ApiPropertyOptional({ description: 'AWS Secret Access Key. Leave blank if unchanged.' })
  @IsOptional()
  @IsString()
  secretAccessKey?: string;

  @ApiPropertyOptional({ description: 'Custom S3 Endpoint URL (e.g. for MinIO, Cloudflare R2, Wasabi)' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Force path-style S3 URLs (http://s3/bucket/key instead of http://bucket.s3/key)', default: false })
  @IsOptional()
  @IsBoolean()
  forcePathStyle?: boolean;

  @ApiPropertyOptional({ description: 'Public URL prefix for serving assets directly' })
  @IsOptional()
  @IsString()
  publicUrlBase?: string;
}

export class TestS3SettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessKeyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secretAccessKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forcePathStyle?: boolean;
}

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({ type: UpdateSmtpSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSmtpSettingsDto)
  smtp?: UpdateSmtpSettingsDto;

  @ApiPropertyOptional({ type: UpdateS3SettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateS3SettingsDto)
  s3_config?: UpdateS3SettingsDto;
}
