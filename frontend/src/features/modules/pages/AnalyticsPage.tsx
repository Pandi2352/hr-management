import React from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { BarChart2, Download } from 'lucide-react';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const PAYROLL_TRENDS = [
  { month: 'Apr', gross: 142000, net: 118000 },
  { month: 'May', gross: 148000, net: 122000 },
  { month: 'Jun', gross: 154000, net: 128000 },
  { month: 'Jul', gross: 159000, net: 132000 },
  { month: 'Aug', gross: 164000, net: 136000 },
  { month: 'Sep', gross: 172000, net: 143000 },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive organizational intelligence, payroll expenditures, and attrition predictive models."
      />

      <StatTileRow>
        <StatTile label="Annual Run Rate" value="$2.06M" unit="Total Payroll" swatch="bg-indigo-500" />
        <StatTile label="Avg Tenure" value="2.4 Yrs" unit="Retention Rate 96%" swatch="bg-emerald-500" />
        <StatTile label="Turnover Index" value="3.2%" unit="Industry Low" swatch="bg-teal-500" />
        <StatTile label="Overtime Index" value="1.8%" unit="Optimized" swatch="bg-amber-500" />
      </StatTileRow>

      <div className="rounded-md border border-hairline bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BarChart2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Monthly Payroll & Compensation Expenditure</h3>
              <p className="text-[11px] text-muted-foreground">Historical cost curves with gross versus net distributions</p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-hairline bg-surface hover:bg-surface-hover text-xs font-semibold self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PAYROLL_TRENDS} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.07} />
              <XAxis dataKey="month" stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Area type="monotone" dataKey="gross" name="Gross Payroll ($)" stroke="#6366F1" strokeWidth={2.5} fill="url(#grossGrad)" />
              <Area type="monotone" dataKey="net" name="Net Disbursed ($)" stroke="#10B981" strokeWidth={2} fill="url(#netGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default AnalyticsPage;
