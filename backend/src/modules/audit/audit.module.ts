import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditController } from './audit.controller';
import { LoginHistoryService } from './login-history.service';
import { OrganizationModule } from '../organization/organization.module';
import {
  LoginAttempt,
  LoginAttemptSchema,
} from '../auth/schemas/login-attempt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LoginAttempt.name, schema: LoginAttemptSchema }]),
    OrganizationModule,
  ],
  controllers: [AuditController],
  providers: [LoginHistoryService],
})
export class AuditApiModule {}
