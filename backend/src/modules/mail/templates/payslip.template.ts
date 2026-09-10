export interface PayslipTemplateParams {
  employeeName: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  periodLabel: string;
  currency: string;
  totalDays: number;
  workingDays: number;
  lopDays: number;
  earnedBasic: number;
  allowances: number;
  bonus: number;
  overtimeAmount: number;
  grossEarnings: number;
  taxDeduction: number;
  providentFund: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  organizationName?: string;
  portalUrl?: string;
}

/** Escapes anything interpolated into the HTML — names and remarks are user input. */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(amount: number, currency: string): string {
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${esc(currency)} ${formatted}`;
}

function row(label: string, amount: number, currency: string, muted = false): string {
  return `
    <tr>
      <td style="padding: 7px 0; font-size: 12.5px; color: ${muted ? '#64748b' : '#475569'};">${esc(label)}</td>
      <td align="right" style="padding: 7px 0; font-size: 12.5px; color: ${muted ? '#64748b' : '#0f172a'}; font-weight: 600; font-variant-numeric: tabular-nums;">${money(amount, currency)}</td>
    </tr>`;
}

/**
 * Payslip email.
 *
 * Table-based layout with inline styles: Outlook and most corporate mail
 * clients strip `<style>` blocks and ignore flex/grid entirely, so anything
 * built the modern way arrives as an unstyled column of text.
 */
export function renderPayslipTemplate(params: PayslipTemplateParams): string {
  const c = params.currency || 'USD';
  const org = params.organizationName || 'PeopleOS';

  const earnings = [
    row('Basic (earned)', params.earnedBasic, c),
    params.allowances ? row('Allowances', params.allowances, c) : '',
    params.bonus ? row('Bonus', params.bonus, c) : '',
    params.overtimeAmount ? row('Overtime', params.overtimeAmount, c) : '',
  ].join('');

  const deductions = [
    params.taxDeduction ? row('Income tax', params.taxDeduction, c) : '',
    params.providentFund ? row('Provident fund', params.providentFund, c) : '',
    params.otherDeductions ? row('Other deductions', params.otherDeductions, c) : '',
    !params.taxDeduction && !params.providentFund && !params.otherDeductions
      ? row('No deductions applied', 0, c, true)
      : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payslip — ${esc(params.periodLabel)}</title></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">

      <tr><td style="padding:28px 32px 18px 32px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">People<span style="color:#4f46e5;">OS</span></div>
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Payslip · ${esc(params.periodLabel)}</div>
      </td></tr>

      <tr><td style="padding:26px 32px 6px 32px;">
        <h2 style="margin:0 0 4px 0;font-size:17px;font-weight:700;color:#0f172a;">Hello ${esc(params.employeeName)},</h2>
        <p style="margin:0 0 18px 0;font-size:13px;line-height:1.6;color:#475569;">
          Your salary for <strong>${esc(params.periodLabel)}</strong> has been processed. A summary is below; keep this email for your records.
        </p>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;margin-bottom:20px;">
          <tr>
            <td style="padding:12px 14px;font-size:11px;color:#64748b;">Employee code<br/><strong style="font-size:12.5px;color:#0f172a;">${esc(params.employeeCode || '—')}</strong></td>
            <td style="padding:12px 14px;font-size:11px;color:#64748b;">Designation<br/><strong style="font-size:12.5px;color:#0f172a;">${esc(params.designation || '—')}</strong></td>
          </tr>
          <tr>
            <td style="padding:0 14px 12px 14px;font-size:11px;color:#64748b;">Department<br/><strong style="font-size:12.5px;color:#0f172a;">${esc(params.department || '—')}</strong></td>
            <td style="padding:0 14px 12px 14px;font-size:11px;color:#64748b;">Days paid<br/><strong style="font-size:12.5px;color:#0f172a;">${esc(params.workingDays)} of ${esc(params.totalDays)}${params.lopDays ? ` · ${esc(params.lopDays)} LOP` : ''}</strong></td>
          </tr>
        </table>

        <div style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:2px;">Earnings</div>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-bottom:1px solid #f1f5f9;margin-bottom:14px;">
          ${earnings}
          <tr>
            <td style="padding:9px 0;font-size:12.5px;color:#0f172a;font-weight:700;border-top:1px solid #f1f5f9;">Gross earnings</td>
            <td align="right" style="padding:9px 0;font-size:12.5px;color:#0f172a;font-weight:700;border-top:1px solid #f1f5f9;font-variant-numeric:tabular-nums;">${money(params.grossEarnings, c)}</td>
          </tr>
        </table>

        <div style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:2px;">Deductions</div>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
          ${deductions}
          <tr>
            <td style="padding:9px 0;font-size:12.5px;color:#0f172a;font-weight:700;border-top:1px solid #f1f5f9;">Total deductions</td>
            <td align="right" style="padding:9px 0;font-size:12.5px;color:#0f172a;font-weight:700;border-top:1px solid #f1f5f9;font-variant-numeric:tabular-nums;">${money(params.totalDeductions, c)}</td>
          </tr>
        </table>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#eef2ff;border:1px solid #e0e7ff;border-radius:6px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;font-weight:700;color:#3730a3;">Net pay</td>
            <td align="right" style="padding:14px 16px;font-size:17px;font-weight:800;color:#4f46e5;font-variant-numeric:tabular-nums;">${money(params.netPay, c)}</td>
          </tr>
        </table>

        ${
          params.portalUrl
            ? `<p style="margin:20px 0 0 0;font-size:12px;color:#64748b;">View past payslips in the <a href="${esc(params.portalUrl)}" style="color:#4f46e5;text-decoration:none;font-weight:600;">employee portal</a>.</p>`
            : ''
        }
        <p style="margin:16px 0 0 0;font-size:11.5px;line-height:1.5;color:#94a3b8;">
          If any figure looks incorrect, contact your HR or payroll administrator before the next cycle.
        </p>
      </td></tr>

      <tr><td style="background-color:#f8fafc;padding:18px 32px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;text-align:center;">
        ${esc(org)} · Confidential payroll document<br/>
        Automated notification, please do not reply.
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
