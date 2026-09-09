import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { BusinessSetting, BusinessSettingDocument } from '../schemas/business-settings.schema';
import { UpdateSmtpSettingsDto, TestSmtpDto } from '../dto/business-settings.dto';
import { LoggerHelper } from '../../../common/logger';

@Injectable()
export class SmtpSettingsService {
  private readonly logger = LoggerHelper.Instance.child(SmtpSettingsService.name);

  constructor(
    @InjectModel(BusinessSetting.name)
    private readonly businessSettingModel: Model<BusinessSettingDocument>,
  ) {}

  /**
   * Internal getter: retrieves complete, unmasked SMTP credentials for MailService dispatch.
   */
  async getActiveSmtpConfig(orgId?: string): Promise<{
    host: string;
    port: number;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
    secure: boolean;
    isConfigured: boolean;
  }> {
    let setting = null;
    if (orgId && orgId !== 'default') {
      setting = await this.businessSettingModel.findOne({ organizationId: orgId }).lean();
    }
    if (!setting || !setting.smtp?.user) {
      setting = await this.businessSettingModel.findOne({ organizationId: 'default' }).lean();
    }

    if (!setting?.smtp) {
      return {
        host: '',
        port: 587,
        user: '',
        pass: '',
        fromName: '',
        fromEmail: '',
        secure: false,
        isConfigured: false,
      };
    }

    const s = setting.smtp;
    return {
      host: s.host || '',
      port: Number(s.port) || 587,
      user: s.user || '',
      pass: s.pass || '',
      fromName: s.fromName || '',
      fromEmail: s.fromEmail || s.user || '',
      secure: Boolean(s.secure || Number(s.port) === 465),
      isConfigured: Boolean(s.isConfigured && s.user && s.pass),
    };
  }

  /**
   * UI-facing getter: returns SMTP configuration with masked password.
   */
  async getSmtpSettings(orgId?: string): Promise<any> {
    const config = await this.getActiveSmtpConfig(orgId);
    let maskedPassword = '';
    if (config.pass) {
      const clean = config.pass.trim();
      if (clean.length > 8) {
        maskedPassword = `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
      } else {
        maskedPassword = '••••••••••••';
      }
    }

    return {
      host: config.host,
      port: config.port,
      user: config.user,
      maskedPassword,
      hasPassword: Boolean(config.pass),
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      secure: config.secure,
      isConfigured: config.isConfigured,
    };
  }

  /**
   * Updates SMTP configuration in MongoDB.
   */
  async updateSmtpSettings(orgId: string, dto: UpdateSmtpSettingsDto, userId: string): Promise<any> {
    const targetOrgId = orgId || 'default';
    let record = await this.businessSettingModel.findOne({ organizationId: targetOrgId });
    if (!record && targetOrgId !== 'default') {
      record = await this.businessSettingModel.findOne({ organizationId: 'default' });
    }

    const existingPass = record?.smtp?.pass || '';
    const newPass = dto.pass && dto.pass.trim() ? dto.pass.trim() : existingPass;

    if (!dto.user?.trim()) {
      throw new BadRequestException('SMTP Username / Email is required');
    }

    await this.businessSettingModel.findOneAndUpdate(
      { organizationId: targetOrgId },
      {
        $set: {
          'smtp.host': dto.host.trim(),
          'smtp.port': Number(dto.port),
          'smtp.user': dto.user.trim(),
          'smtp.pass': newPass,
          'smtp.fromName': dto.fromName !== undefined ? dto.fromName.trim() : (record?.smtp?.fromName || ''),
          'smtp.fromEmail': dto.fromEmail ? dto.fromEmail.trim() : dto.user.trim(),
          'smtp.secure': Boolean(dto.secure || Number(dto.port) === 465),
          'smtp.isConfigured': Boolean(dto.user && newPass),
          updatedBy: userId,
        },
      },
      { new: true, upsert: true },
    );

    this.logger.info(null, `Updated SMTP settings for org: ${targetOrgId}`, {
      host: dto.host,
      port: dto.port,
      user: dto.user,
    });

    return this.getSmtpSettings(targetOrgId);
  }

  /**
   * Tests SMTP credentials by verifying connection and dispatching a test email.
   */
  async testSmtpConnection(orgId: string, dto: TestSmtpDto): Promise<{ success: boolean; message: string; diagnostic?: any }> {
    const active = await this.getActiveSmtpConfig(orgId);

    const host = dto.host || active.host;
    const port = Number(dto.port || active.port);
    const user = dto.user || active.user;
    const pass = dto.pass && dto.pass.trim() ? dto.pass.trim() : active.pass;
    const fromName = dto.fromName || active.fromName || 'System';
    const fromEmail = dto.fromEmail || active.fromEmail || user;
    const secure = dto.secure !== undefined ? Boolean(dto.secure) : (port === 465);

    if (!user || !pass) {
      throw new BadRequestException('Cannot test connection: SMTP User and Password are required.');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    try {
      await transporter.verify();

      const now = new Date().toLocaleString();
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: dto.toEmail,
        subject: `[Test] PeopleOS SMTP Mail Gateway Connected Successfully (${now})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
            <div style="border-bottom: 2px solid #524b6e; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0; font-size: 20px;">PeopleOS Enterprise Mail Gateway</h2>
              <p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px;">SMTP Diagnostics & Live Verification</p>
            </div>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 14px; margin-bottom: 18px;">
              <p style="color: #065f46; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">✓ SMTP Connection Verified</p>
              <p style="color: #047857; font-size: 12px; margin: 0;">Your email dispatch configuration is online and ready for onboarding letters and notifications.</p>
            </div>
            <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Host:</strong></td><td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${host}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;"><strong>Port:</strong></td><td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${port} (${secure ? 'SSL' : 'STARTTLS'})</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;"><strong>Authenticated User:</strong></td><td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${user}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;"><strong>Sender Identity:</strong></td><td style="padding: 6px 0; color: #0f172a;">${fromName} &lt;${fromEmail}&gt;</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;"><strong>Dispatched At:</strong></td><td style="padding: 6px 0; color: #0f172a;">${now}</td></tr>
            </table>
            <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
              Sent from Business Settings via PeopleOS Enterprise Workforce Management
            </div>
          </div>
        `,
      });

      await this.businessSettingModel.updateOne(
        { organizationId: orgId || 'default' },
        { $set: { 'smtp.lastVerifiedAt': new Date(), 'smtp.isConfigured': true } },
      );

      return {
        success: true,
        message: `Test email successfully dispatched to ${dto.toEmail}! SMTP gateway is operational.`,
        diagnostic: {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
        },
      };
    } catch (err: any) {
      this.logger.error(null, 'SMTP Verification Failed', err);
      throw new BadRequestException(
        `SMTP Connection Error: ${err.message || 'Failed to authenticate with SMTP server'}. Please check host, port, username, and app password.`,
      );
    }
  }
}
