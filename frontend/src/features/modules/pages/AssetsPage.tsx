import React from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Laptop, Monitor } from 'lucide-react';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';

const ASSETS = [
  { id: 'AST-1049', type: 'MacBook Pro 16" M3 Max', serial: 'C02G87XA91P', assignedTo: 'Sophia Chen', dept: 'Engineering', status: 'ALLOCATED', purchaseDate: 'Jan 2026' },
  { id: 'AST-1050', type: 'Dell XPS 15 9530', serial: 'DL9948102X', assignedTo: 'Marcus Brody', dept: 'Product', status: 'ALLOCATED', purchaseDate: 'Feb 2026' },
  { id: 'AST-1051', type: 'Apple Studio Display 27"', serial: 'AP4882103S', assignedTo: 'Priya Sharma', dept: 'Design', status: 'ALLOCATED', purchaseDate: 'Mar 2026' },
  { id: 'AST-1052', type: 'ThinkPad X1 Carbon Gen 11', serial: 'TP1829401Y', assignedTo: 'Unassigned (Stock)', dept: 'IT Inventory', status: 'AVAILABLE', purchaseDate: 'Aug 2026' },
];

export const AssetsPage: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Asset Management"
        description="Track physical hardware, laptops, peripherals, access cards, and company licenses."
      />

      <StatTileRow>
        <StatTile label="Total Assets" value="142" unit="Tracked Units" swatch="bg-teal-500" />
        <StatTile label="Assigned" value="128" unit="In Active Use" swatch="bg-emerald-500" />
        <StatTile label="In Inventory" value="14" unit="Ready to Deploy" swatch="bg-blue-500" />
        <StatTile label="Under Repair" value="0" unit="Zero Downtime" swatch="bg-amber-500" />
      </StatTileRow>

      <div className="rounded-md border border-hairline bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Hardware & Device Inventory</h3>
              <p className="text-[11px] text-muted-foreground">Assigned computing devices and equipment across all employees</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-hairline">
          {ASSETS.map((asset) => (
            <div key={asset.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-surface-hover border border-hairline shrink-0">
                  <Monitor className="h-4 w-4 text-teal-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">{asset.type}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">({asset.id})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground mt-0.5">
                    <span>Serial: {asset.serial}</span>
                    <span>•</span>
                    <span>{asset.dept}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-xs font-semibold text-foreground block">{asset.assignedTo}</span>
                  <span className="text-[10px] text-muted-foreground">Purchased {asset.purchaseDate}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    asset.status === 'ALLOCATED'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {asset.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default AssetsPage;
