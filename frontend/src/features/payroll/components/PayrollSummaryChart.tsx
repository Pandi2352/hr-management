import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { SelectField } from '../../../components/ui/SelectField';
import { cn } from '../../../utils/cn';
import type { MonthlyPayrollSummary } from '../types/payroll.types';

interface PayrollSummaryChartProps {
  data: MonthlyPayrollSummary[];
  className?: string;
}

const CustomPayrollTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md bg-slate-900/95 dark:bg-slate-800/95 text-white px-3 py-2 shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[160px]">
        <div className="font-bold text-slate-100 border-b border-slate-700/80 pb-1 mb-1.5 flex items-center justify-between">
          <span>{label} Payroll</span>
        </div>
        <div className="space-y-1 text-[11px]">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name === 'grossSalary'
                  ? 'Gross Salary'
                  : entry.name === 'netSalary'
                  ? 'Net Salary'
                  : 'Tax Deduction'}
                :
              </span>
              <span className="font-bold tabular-nums" style={{ color: entry.color }}>
                ${(Number(entry.value) || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const PayrollSummaryChart: React.FC<PayrollSummaryChartProps> = ({
  data,
  className,
}) => {
  const [period, setPeriod] = useState('YEARLY');

  return (
    <div
      className={cn(
        'relative h-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Payroll Summary</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gross disbursement, net payout & statutory tax withholding
          </p>
        </div>

        <div className="w-28 shrink-0">
          <SelectField
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'QUARTERLY', label: 'Quarterly' },
              { value: 'YEARLY', label: 'Yearly' },
            ]}
          />
        </div>
      </div>

      {/* Composed Chart: Stacked Bar + Line Overlay */}
      <div className="w-full h-64 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            barSize={15}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              className="dark:stroke-slate-800/80"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              dy={6}
            />
            <YAxis
              domain={[0, 100000]}
              ticks={[0, 20000, 40000, 60000, 80000, 100000]}
              tickFormatter={(v) => (v === 0 ? '0K' : `${v / 1000}K`)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomPayrollTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />

            {/* Stacked Bars: Bottom (Gross Salary in orange), Top (Net Salary in blue) */}
            <Bar
              dataKey="grossSalary"
              stackId="payroll"
              fill="#ea580c"
              name="grossSalary"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="netSalary"
              stackId="payroll"
              fill="#2563eb"
              name="netSalary"
              radius={[4, 4, 0, 0]}
            />

            {/* Overlaid Line: Tax Deduction in cyan */}
            <Line
              type="monotone"
              dataKey="taxDeduction"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
              name="taxDeduction"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend matching Screenshot */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ea580c]" />
          <span>Gross Salary</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
          <span>Net Salary</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-[#06b6d4]" />
          <span>Tax Dedication</span>
        </div>
      </div>
    </div>
  );
};
