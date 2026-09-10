import { Injectable } from '@nestjs/common';
import {
  AccountSecurityMailService,
  InvitationMailService,
  InvitationMailParams,
  OnboardingMailService,
  OnboardingCredentialsMailParams,
  PasswordResetMailService,
  PayslipMailService,
  PayslipMailParams,
} from './services';

/**
 * Facade over the per-concern mail services.
 *
 * Each kind of mail lives in its own file under `services/`, mirroring how the
 * bodies are organised under `templates/`. This class stays as the injection
 * point so the five modules that already depend on `MailService` are untouched,
 * and so a caller does not have to know which service owns which message.
 *
 * New mail belongs in a new `services/*.mail.service.ts` plus a matching
 * template — not appended here.
 */
@Injectable()
export class MailService {
  constructor(
    private readonly passwordResetMail: PasswordResetMailService,
    private readonly invitationMail: InvitationMailService,
    private readonly accountSecurityMail: AccountSecurityMailService,
    private readonly onboardingMail: OnboardingMailService,
    private readonly payslipMail: PayslipMailService,
  ) {}

  /** Throws on failure: the user is waiting on this code. */
  sendPasswordResetOtp(email: string, otp: string, recipientName = 'User'): Promise<void> {
    return this.passwordResetMail.sendOtp(email, otp, recipientName);
  }

  /** Throws on failure: the user is waiting on this link. */
  sendPasswordResetLink(
    email: string,
    resetToken: string,
    recipientName = 'User',
  ): Promise<void> {
    return this.passwordResetMail.sendResetLink(email, resetToken, recipientName);
  }

  sendInvitationEmail(params: InvitationMailParams): Promise<boolean> {
    return this.invitationMail.sendInvitation(params);
  }

  sendAccountLockedNotification(email: string, recipientName = 'User'): Promise<boolean> {
    return this.accountSecurityMail.sendAccountLocked(email, recipientName);
  }

  sendOnboardingCredentialsEmail(
    params: OnboardingCredentialsMailParams,
  ): Promise<boolean> {
    return this.onboardingMail.sendCredentials(params);
  }

  sendPayslipEmail(params: PayslipMailParams): Promise<boolean> {
    return this.payslipMail.sendPayslip(params);
  }
}
