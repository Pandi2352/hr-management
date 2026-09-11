import React from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { ShieldCheck, FileCheck2, Calendar } from 'lucide-react';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';

const AUDITS = [
  { name: 'SOC 2 Type II Security Assessment', agency: 'Grant Thornton LLP', status: 'COMPLIANT', validUntil: 'Dec 31, 2026', riskScore: 'Low' },
  { name: 'ISO/IEC 27001:2022 ISMS Certification', agency: 'BSI Group', status: 'COMPLIANT', validUntil: 'Nov 15, 2026', riskScore: 'Low' },
  { name: 'GDPR / Personal Data Protection Framework', agency: 'Internal Privacy Committee', status: 'IN_REVIEW', validUntil: 'Annual (Oct 2026)', riskScore: 'Medium' },
  { name: 'Statutory Labor Law & Minimum Wages Filing', agency: 'State Labor Department', status: 'FILED', validUntil: 'Monthly', riskScore: 'Low' },
];

export const CompliancePage: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Compliance & Governance Center"
        description="Regulatory frameworks, statutory filings, labor laws, and data protection certifications."
      />

      <StatTileRow>
        <StatTile label="Compliance Score" value="98.6%" unit="Audit Grade A+" swatch="bg-emerald-500" />
        <StatTile label="Certifications" value="4 Active" unit="Globally Recognized" swatch="bg-indigo-500" />
        <StatTile label="Pending Filings" value="1" unit="Labor Board Q3" swatch="bg-amber-500" />
        <StatTile label="Risk Incidents" value="0" unit="Zero Violations" swatch="bg-teal-500" />
      </StatTileRow>

      <div className="rounded-md border border-hairline bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-hairline">
          <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Active Audits & Statutory Certifications</h3>
            <p className="text-[11px] text-muted-foreground">Certified compliance standards maintained by the organization</p>
          </div>
        </div>

        <div className="divide-y divide-hairline">
          {AUDITS.map((item, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-surface-hover border border-hairline shrink-0">
                  <FileCheck2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-foreground block">{item.name}</span>
                  <span className="text-[10.5px] text-muted-foreground">Auditor: {item.agency}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Valid: {item.validUntil}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default CompliancePage;
