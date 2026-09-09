import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import {
  BusinessSetting,
  BusinessSettingSchema,
} from './schemas/business-settings.schema';
import { S3Module } from '../../common/s3/s3.module';
import {
  SmtpSettingsService,
  S3SettingsService,
  MinioSettingsService,
} from './services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessSetting.name, schema: BusinessSettingSchema },
    ]),
    S3Module,
  ],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    SmtpSettingsService,
    S3SettingsService,
    MinioSettingsService,
  ],
  exports: [
    SettingsService,
    SmtpSettingsService,
    S3SettingsService,
    MinioSettingsService,
  ],
})
export class SettingsModule {}
