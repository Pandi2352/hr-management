import { Injectable } from '@nestjs/common';
import { LoggerHelper } from '../../../common/logger';
import { MailTransportService } from '../mail-transport.service';
import {
  renderPasswordResetLinkTemplate,
  renderPasswordResetOtpTemplate,
} from '../templates';

/**
 * Password recovery mail.
 *
 * These two throw on failure, unlike most mail in the app. A reset the user is
 * actively waiting on must not report success when nothing was delivered —
 * they would sit watching an inbox that never receives anything.
 */
@Injectable()
export class PasswordResetMailService {
  private readonly logger = LoggerHelper.Instance.child(PasswordResetMailService.name);

  constructor(private readonly transport: MailTransportService) {}

  async sendOtp(email: string, otp: string, recipientName = 'User'): Promise<void> {
    const { transporter, from } = await this.transport.getSenderClient();
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

  async sendResetLink(email: string, resetToken: string, recipientName = 'User'): Promise<void> {
    const { transporter, from } = await this.transport.getSenderClient();
    const resetUrl = `${this.transport.frontendUrl()}/auth/reset-password?token=${resetToken}`;
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
}
