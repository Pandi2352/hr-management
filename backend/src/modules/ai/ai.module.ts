import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { OpencodeProvider } from './providers/opencode.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { AiSettingsService } from './ai-settings.service';
import { AiProviderSetting, AiProviderSettingSchema } from './schemas/ai-provider-setting.schema';
import { JobApplication, JobApplicationSchema } from '../recruitment/schemas/job-application.schema';
import { JobVacancy, JobVacancySchema } from '../recruitment/schemas/job-vacancy.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { LeaveBalance, LeaveBalanceSchema } from '../leave/schemas/leave-balance.schema';
import { LeaveType, LeaveTypeSchema } from '../leave/schemas/leave-type.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leave/schemas/leave-request.schema';
import { Holiday, HolidaySchema } from '../leave/schemas/holiday.schema';
import { HolidayCalendar, HolidayCalendarSchema } from '../leave/schemas/holiday-calendar.schema';
import { RestrictedHolidayOpt, RestrictedHolidayOptSchema } from '../leave/schemas/restricted-holiday-opt.schema';
import { AttendanceRecord, AttendanceRecordSchema } from '../attendance/schemas/attendance-record.schema';
import { Organization, OrganizationSchema } from '../organization/schemas/organization.schema';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: JobVacancy.name, schema: JobVacancySchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: LeaveType.name, schema: LeaveTypeSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: Holiday.name, schema: HolidaySchema },
      { name: HolidayCalendar.name, schema: HolidayCalendarSchema },
      { name: RestrictedHolidayOpt.name, schema: RestrictedHolidayOptSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: AiProviderSetting.name, schema: AiProviderSettingSchema },
    ]),
    OrganizationModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiSettingsService,
    OpenAiProvider,
    AnthropicProvider,
    GeminiProvider,
    GroqProvider,
    OpencodeProvider,
    OllamaProvider,
  ],
  exports: [
    AiService,
    AiSettingsService,
    OpenAiProvider,
    AnthropicProvider,
    GeminiProvider,
    GroqProvider,
    OpencodeProvider,
    OllamaProvider,
  ],
})
export class AiModule {}
