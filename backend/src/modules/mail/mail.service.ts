import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerHelper } from '../../common/logger';

@Injectable()
export class MailService {
  private readonly logger = LoggerHelper.Instance.child(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

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

  async sendPasswordResetOtp(email: string, otp: string, recipientName: string = 'User'): Promise<void> {
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'PeopleOS Security <no-reply@peopleos.internal>',
    );

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                      People<span style="color: #4f46e5;">OS</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                      Security & Identity Verification
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Password Reset Verification Code
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientName}</strong>, we received a request to reset your workplace account password. Use the single-use verification code below to proceed:
              </p>

              <!-- OTP Code Display -->
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">
                  ${otp}
                </span>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                  Expires in 10 minutes • Single use only
                </div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Enterprise Workforce Operating System<br/>
              Automated system notification, please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
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
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'PeopleOS Security <no-reply@peopleos.internal>',
    );
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                      People<span style="color: #4f46e5;">OS</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                      Security & Identity Protection
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientName}</strong>, we received a request to reset your PeopleOS workplace account password. Click the secure link below to create a new password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 13px; padding: 12px 28px; border-radius: 6px; text-decoration: none;">
                  Reset My Password
                </a>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                Or copy and paste this secure link into your browser:
              </p>
              <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; font-size: 11px; font-family: monospace; word-break: break-all; color: #475569; margin-bottom: 20px;">
                ${resetUrl}
              </div>

              <div style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This link will expire in 15 minutes and can only be used once. If you did not request this change, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Enterprise Workforce Operating System<br/>
              Automated system notification, please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
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
  }): Promise<boolean> {
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'PeopleOS Security <no-reply@peopleos.internal>',
    );

    const expiryLabel =
      params.expiresInHours % 24 === 0
        ? `${params.expiresInHours / 24} day(s)`
        : `${params.expiresInHours} hour(s)`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to PeopleOS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9; background-color: #524b6e;">
              <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                People<span style="color: #c084fc;">OS</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #e2e8f0; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px;">
                Administrative Console Invitation
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                You've been invited to manage ${params.orgName} on PeopleOS
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                <strong>${params.inviterName}</strong> has invited you to join the PeopleOS administrative console with the role of <strong>${params.roleLabel}</strong>. Accept the invitation below to set up your account password and get started.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${params.acceptUrl}" style="display: inline-block; background-color: #524b6e; color: #ffffff; font-weight: 600; font-size: 13px; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
                  Accept Invitation &amp; Set Password
                </a>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                Or copy and paste this secure link into your browser:
              </p>
              <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; font-size: 11px; font-family: monospace; word-break: break-all; color: #475569; margin-bottom: 20px;">
                ${params.acceptUrl}
              </div>

              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px;">
                <p style="margin: 0; font-size: 12px; color: #b45309; line-height: 1.5;">
                  <strong>Security notice:</strong> This invitation link expires in ${expiryLabel} and can only be used once. If you were not expecting this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Secure Enterprise Workforce System<br/>
              Automated system notification, please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
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
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'PeopleOS Security <no-reply@peopleos.internal>',
    );

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Account Locked - Security Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                People<span style="color: #4f46e5;">OS</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                Security Alert
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #b91c1c;">
                Your account has been locked
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientName}</strong>, we detected multiple consecutive failed sign-in attempts on your PeopleOS account and have temporarily locked it as a security precaution.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If this wasn't you, we recommend resetting your password once your account is unlocked. If you believe this is an error, contact your organization's IT Security Officer or HR Administrator to unlock your account immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Enterprise Workforce Operating System<br/>
              Automated system notification, please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
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
    employeeName: string;
    employeeCode: string;
    workEmail: string;
    temporaryPassword: string;
  }): Promise<boolean> {
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'PeopleOS Onboarding <onboarding@peopleos.internal>',
    );
    const loginUrl = this.configService.get<string>('PORTAL_LOGIN_URL', 'http://localhost:5173/login');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Welcome to PeopleOS — Your Workplace Account Credentials</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9; background-color: #524b6e;">
              <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                People<span style="color: #c084fc;">OS</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #e2e8f0; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px;">
                Enterprise Workforce Portal
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Welcome to the Organization, ${params.employeeName}!
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Your official organizational employee record and workplace account have been provisioned on PeopleOS. Below are your secure login credentials to access the self-service employee portal:
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
                  <tr>
                    <td style="color: #64748b; font-weight: 600; width: 140px;">Employee ID:</td>
                    <td style="color: #0f172a; font-family: monospace; font-weight: 700;">${params.employeeCode}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Workplace Email:</td>
                    <td style="color: #0f172a; font-weight: 600;">${params.workEmail}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Temporary Password:</td>
                    <td style="color: #524b6e; font-family: monospace; font-weight: 800; font-size: 14px; letter-spacing: 0.5px;">${params.temporaryPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${loginUrl}" style="display: inline-block; background-color: #524b6e; color: #ffffff; font-weight: 600; font-size: 13px; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
                  Sign In to Employee Portal
                </a>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #b45309; line-height: 1.5;">
                  <strong>Important Security Notice:</strong> This is an auto-generated temporary password. You are required to change your password upon initial sign-in. Do not share these credentials with anyone.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Need assistance? Contact your internal Human Resources Department or Organization Administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Secure Enterprise Workforce System<br/>
              Confidential automated notification dispatched to your personal contact email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to: params.toEmail,
        subject: `[PeopleOS] Welcome ${params.employeeName} — Your Workplace Account Credentials`,
        html,
      });
      this.logger.info(null, 'Onboarding credentials email sent', {
        email: params.toEmail,
        employeeCode: params.employeeCode,
      });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Onboarding credentials email delivery failed', err);
      return false;
    }
  }
}

