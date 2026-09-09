import { Injectable, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerHelper } from '../../common/logger';
import { SettingsService } from '../settings/settings.service';
import {
  renderPasswordResetOtpTemplate,
  renderPasswordResetLinkTemplate,
  renderInvitationTemplate,
  renderAccountLockedTemplate,
  renderOnboardingCredentialsTemplate,
} from './templates';

@Injectable()
export class MailService {
  private readonly logger = LoggerHelper.Instance.child(MailService.name);
  private transporter?: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(SettingsService) private readonly settingsService?: SettingsService,
  ) {
    const host = this.configService.get<string>('SMTP_HOST', '');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  /**
   * Resolves active nodemailer transporter and sender identity dynamically from Business Settings in DB.
   */
  private async getSenderClient(orgId?: string): Promise<{ transporter: nodemailer.Transporter; from: string }> {
    try {
      if (this.settingsService) {
        const config = await this.settingsService.getActiveSmtpConfig(orgId);
        if (config && config.isConfigured && config.user && config.pass) {
          const dynamicTransporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
              user: config.user,
              pass: config.pass,
            },
          });
          const from = config.fromName
            ? `"${config.fromName}" <${config.fromEmail || config.user}>`
            : (config.fromEmail || config.user);
          return { transporter: dynamicTransporter, from };
        }
      }
    } catch (err: any) {
      this.logger.warn(null, 'Failed to resolve dynamic SMTP settings from database', err);
    }

    if (this.transporter) {
      const defaultFrom = this.configService.get<string>('MAIL_FROM', '');
      return { transporter: this.transporter, from: defaultFrom };
    }

    throw new Error('SMTP credentials are not configured. Please configure your SMTP settings in Business Settings UI.');
  }

  async sendPasswordResetOtp(email: string, otp: string, recipientName: string = 'User'): Promise<void> {
    const { transporter, from } = await this.getSenderClient();
    const html = renderPasswordResetOtpTemplate({ otp, recipientName });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `[PeopleOS] ${otp} is your verification code`,
        html,
      });
      this.logger.info(null, 'Password reset OTP email sent', { email });
    } catch (err: any) {
      this.logger.error(null, 'Password reset OTP email failed', err);
      throw new Error(`Unable to send verification email: ${err.message}`);
    }
  }

  async sendPasswordResetLink(
    email: string,
    resetToken: string,
    recipientName: string = 'User',
  ): Promise<void> {
    const { transporter, from } = await this.getSenderClient();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
    const html = renderPasswordResetLinkTemplate({ resetUrl, recipientName });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `[PeopleOS] Reset your password link`,
        html,
      });
      this.logger.info(null, 'Password reset link email sent', { email });
    } catch (err: any) {
      this.logger.error(null, 'Password reset link email failed', err);
      throw new Error(`Unable to send verification email: ${err.message}`);
    }
  }

  async sendInvitationEmail(params: {
    toEmail: string;
    inviterName: string;
    roleLabel: string;
    orgName: string;
    acceptUrl: string;
    expiresInHours: number;
    orgId?: string;
  }): Promise<boolean> {
    const { transporter, from } = await this.getSenderClient(params.orgId);
    const html = renderInvitationTemplate(params);

    try {
      await transporter.sendMail({
        from,
        to: params.toEmail,
        subject: `[PeopleOS] ${params.inviterName} invited you to manage ${params.orgName}`,
        html,
      });
      this.logger.info(null, 'Invitation email sent', { email: params.toEmail });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Invitation email delivery failed', err);
      return false;
    }
  }

  async sendAccountLockedNotification(email: string, recipientName: string = 'User'): Promise<boolean> {
    const { transporter, from } = await this.getSenderClient();
    const html = renderAccountLockedTemplate({ recipientName });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `[PeopleOS] Security Alert: Your account has been locked`,
        html,
      });
      this.logger.info(null, 'Account locked notification sent', { email });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Account locked notification delivery failed', err);
      return false;
    }
  }

  async sendOnboardingCredentialsEmail(params: {
    toEmail: string;
    loginEmail?: string;
    employeeName: string;
    employeeCode: string;
    workEmail?: string;
    temporaryPassword: string;
    department?: string;
    designation?: string;
    joiningDate?: string;
    orgId?: string;
  }): Promise<boolean> {
    const { transporter, from } = await this.getSenderClient(params.orgId);
    const loginUrl = this.configService.get<string>('PORTAL_LOGIN_URL', 'http://localhost:5173/login');
    const html = renderOnboardingCredentialsTemplate({ ...params, loginUrl });

    try {
      await transporter.sendMail({
        from,
        to: params.toEmail,
        subject: `[PeopleOS] Official Offer & Welcome Letter — Account Credentials for ${params.employeeName}`,
        html,
      });
      this.logger.info(null, 'Official offer & welcome email sent', {
        email: params.toEmail,
        employeeCode: params.employeeCode,
      });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Offer & welcome email delivery failed', err);
      return false;
    }
  }
}
