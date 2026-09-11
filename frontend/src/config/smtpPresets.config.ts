export interface SmtpPreset {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  hint: string;
}

export const SMTP_PRESETS: SmtpPreset[] = [
  {
    id: 'gmail',
    name: 'Google Workspace / Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    hint: 'Requires 16-character Google App Password (2-Step Verification enabled)',
  },
  {
    id: 'office365',
    name: 'Microsoft 365 / Outlook',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    hint: 'Office 365 SMTP relay with STARTTLS enabled',
  },
  {
    id: 'sendgrid',
    name: 'Twilio SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    hint: 'Username: apikey, Password: your SendGrid API key',
  },
  {
    id: 'ses',
    name: 'Amazon Simple Email Service (SES)',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    hint: 'Use SMTP credentials generated from AWS SES console',
  },
  {
    id: 'custom',
    name: 'Custom SMTP Relay',
    host: '',
    port: 587,
    secure: false,
    hint: 'Enter your enterprise SMTP host, port, and authentication credentials',
  },
];
