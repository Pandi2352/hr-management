import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { UsersModule } from './modules/users/users.module';
import { AuditApiModule } from './modules/audit/audit.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { OnboardingModule } from './modules/lifecycle/onboarding/onboarding.module';
import { ProbationModule } from './modules/lifecycle/probation/probation.module';
import { TransitionsModule } from './modules/lifecycle/transitions/transitions.module';
import { LeaveModule } from './modules/leave/leave.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AiModule } from './modules/ai/ai.module';
import { SettingsModule } from './modules/settings/settings.module';
import { S3Module } from './common/s3/s3.module';
import { AuditModule } from './common/audit/audit.module';
import { CacheModule } from './common/cache';
import { RequestContextMiddleware } from './common/audit/request-context';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    CacheModule,
    AuditModule,
    AuthModule,
    OrganizationModule,
    EmployeesModule,
    UsersModule,
    AuditApiModule,
    RecruitmentModule,
    OnboardingModule,
    ProbationModule,
    TransitionsModule,
    LeaveModule,
    AttendanceModule,
    AiModule,
    SettingsModule,
    S3Module,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Establishes requestId / IP / user-agent context for every request so
    // audit records are correlatable without threading params through services.
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
