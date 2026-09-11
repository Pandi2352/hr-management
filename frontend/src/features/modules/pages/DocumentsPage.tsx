import React from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { FileText, Download, FolderArchive } from 'lucide-react';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';

const DOCS = [
  { id: '1', name: 'Nexora Employee Handbook 2026.pdf', category: 'HR Policies', size: '2.4 MB', updated: 'Sep 01, 2026', access: 'All Employees' },
  { id: '2', name: 'Information Security & Data Protection Policy.pdf', category: 'Compliance', size: '1.8 MB', updated: 'Aug 20, 2026', access: 'All Employees' },
  { id: '3', name: 'Group Health Insurance & Mediclaim Benefits.pdf', category: 'Benefits', size: '3.1 MB', updated: 'Jul 15, 2026', access: 'All Employees' },
  { id: '4', name: 'Executive Travel & Expense Reimbursement Guide.pdf', category: 'Finance', size: '1.2 MB', updated: 'Jun 10, 2026', access: 'Managers' },
];

export const DocumentsPage: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Document Vault"
        description="Centralized repository for organizational policies, contracts, certificates, and compliance manuals."
      />

      <StatTileRow>
        <StatTile label="Total Documents" value="64" unit="Files Managed" swatch="bg-blue-500" />
        <StatTile label="Policy Updates" value="3" unit="Past 30 Days" swatch="bg-emerald-500" />
        <StatTile label="Storage Utilized" value="482 MB" unit="Encrypted Cloud" swatch="bg-violet-500" />
        <StatTile label="Sign-off Required" value="1" unit="Action Item" swatch="bg-amber-500" />
      </StatTileRow>

      <div className="rounded-md border border-hairline bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FolderArchive className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Official Corporate Repositories</h3>
              <p className="text-[11px] text-muted-foreground">Download or view validated HR policies and company directives</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-hairline">
          {DOCS.map((doc) => (
            <div key={doc.id} className="py-3 flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-md bg-surface-hover border border-hairline shrink-0">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-foreground block truncate group-hover:text-blue-600 transition-colors">
                    {doc.name}
                  </span>
                  <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground mt-0.5">
                    <span>{doc.category}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span>Updated {doc.updated}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-hover border border-hairline text-muted-foreground hidden sm:inline-block">
                  {doc.access}
                </span>
                <button
                  type="button"
                  className="p-1.5 rounded-md border border-hairline bg-surface hover:bg-surface-hover text-foreground transition-all"
                  title="Download File"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DocumentsPage;
