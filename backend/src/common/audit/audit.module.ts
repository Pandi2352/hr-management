import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { AuditService } from './audit.service';
import {
  Organization,
  OrganizationSchema,
} from '../../modules/organization/schemas/organization.schema';

/**
 * Global so every domain module can inject AuditService without re-importing
 * it — audit logging is a cross-cutting concern (checklist §1).
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService, MongooseModule],
})
export class AuditModule {}
