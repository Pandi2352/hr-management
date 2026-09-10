import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsModule } from '../settings/settings.module';
import { MailService } from './mail.service';
import { MailTransportService } from './mail-transport.service';
import {
  AccountSecurityMailService,
  InvitationMailService,
  OnboardingMailService,
  PasswordResetMailService,
  PayslipMailService,
} from './services';

/**
 * Mail is split by concern: one service and one template per kind of message,
 * over a shared transport.
 *
 * The individual services are exported too, so a module that only ever sends
 * payslips can depend on `PayslipMailService` instead of the whole facade.
 */
@Module({
  imports: [ConfigModule, SettingsModule],
  providers: [
    MailTransportService,
    PasswordResetMailService,
    InvitationMailService,
    AccountSecurityMailService,
    OnboardingMailService,
    PayslipMailService,
    MailService,
  ],
  exports: [
    MailService,
    MailTransportService,
    PasswordResetMailService,
    InvitationMailService,
    AccountSecurityMailService,
    OnboardingMailService,
    PayslipMailService,
  ],
})
export class MailModule {}
