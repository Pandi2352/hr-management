export interface OnboardingCredentialsTemplateParams {
  toEmail: string;
  loginEmail?: string;
  employeeName: string;
  employeeCode: string;
  temporaryPassword: string;
  loginUrl: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
}

export function renderOnboardingCredentialsTemplate(params: OnboardingCredentialsTemplateParams): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const signinEmail = params.loginEmail || params.toEmail;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Offer & Welcome Letter — Workplace Account Credentials</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; border-bottom: 1px solid #f1f5f9; background-color: #524b6e;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      People<span style="color: #c084fc;">OS</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #e2e8f0; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px;">
                      Official Offer &amp; Welcome Letter
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 4px; font-size: 10px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px;">
                      Ref: ${params.employeeCode}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
                Date: <strong>${today}</strong>
              </div>

              <h2 style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Welcome to the Organization, ${params.employeeName}!
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                On behalf of the executive leadership and team, we are pleased to confirm your appointment and extend a warm welcome to our organization. Your employee master record and official workplace accounts have been established in the PeopleOS Enterprise System.
              </p>

              <!-- Appointment Overview -->
              ${(params.designation || params.department || params.joiningDate) ? `
              <div style="background-color: #f1f5f9; border-left: 3px solid #524b6e; padding: 14px 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
                <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 12px;">
                  ${params.designation ? `<tr><td style="color: #64748b; width: 140px; font-weight: 600;">Role / Title:</td><td style="color: #0f172a; font-weight: 700;">${params.designation}</td></tr>` : ''}
                  ${params.department ? `<tr><td style="color: #64748b; font-weight: 600;">Department:</td><td style="color: #0f172a; font-weight: 600;">${params.department}</td></tr>` : ''}
                  ${params.joiningDate ? `<tr><td style="color: #64748b; font-weight: 600;">Official Joining Date:</td><td style="color: #0f172a; font-weight: 600;">${params.joiningDate}</td></tr>` : ''}
                </table>
              </div>
              ` : ''}

              <h3 style="margin: 20px 0 10px 0; font-size: 14px; font-weight: 700; color: #0f172a;">
                Your Portal Login Credentials
              </h3>
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                Please use your registered Gmail address and the temporary password below to sign in to the self-service employee portal:
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
                  <tr>
                    <td style="color: #64748b; font-weight: 600; width: 160px;">Employee ID:</td>
                    <td style="color: #0f172a; font-family: monospace; font-weight: 700;">${params.employeeCode}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Login Email (Gmail):</td>
                    <td style="color: #0f172a; font-weight: 700;">${signinEmail}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; font-weight: 600;">Temporary Password:</td>
                    <td style="color: #524b6e; font-family: monospace; font-weight: 800; font-size: 14px; letter-spacing: 0.5px;">${params.temporaryPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 26px 0;">
                <a href="${params.loginUrl}" style="display: inline-block; background-color: #524b6e; color: #ffffff; font-weight: 600; font-size: 13px; padding: 12px 36px; border-radius: 6px; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  Sign In to Employee Portal
                </a>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #b45309; line-height: 1.5;">
                  <strong>Important Security Note:</strong> For your security, this is a system-generated temporary password. You will be required to change your password upon initial login. Please keep these credentials confidential.
                </p>
              </div>

              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #475569; line-height: 1.5;">
                <p style="margin: 0 0 4px 0; font-weight: 600;">Warm regards,</p>
                <p style="margin: 0; color: #64748b;">People Operations &amp; Human Resources</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Enterprise Workforce Operating System<br/>
              Dispatched directly to your registered Gmail address: <strong>${params.toEmail}</strong>
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
