export interface PasswordResetOtpTemplateParams {
  otp: string;
  recipientName?: string;
}

export function renderPasswordResetOtpTemplate(params: PasswordResetOtpTemplateParams): string {
  const recipientName = params.recipientName || 'User';
  return `
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
                  ${params.otp}
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
  `.trim();
}
