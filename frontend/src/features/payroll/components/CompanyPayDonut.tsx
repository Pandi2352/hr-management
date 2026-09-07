import React, { useState } from 'react';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { cn } from '../../../utils/cn';
import type { CompanyPayBreakdown } from '../types/payroll.types';

interface CompanyPayDonutProps {
  breakdown: CompanyPayBreakdown[];
  totalCount?: number;
  onDownloadReport?: () => void;
  className?: string;
}

const CustomCompanyPayTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-md bg-slate-900/95 dark:bg-slate-800/95 text-white px-3 py-1.5 shadow-xl border border-slate-700 text-xs backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: data.payload.color }}
          />
          <span className="font-semibold text-slate-200">{data.name}:</span>
          <span className="font-bold text-white tabular-nums">
            {data.payload.percentage}% (${data.payload.amount.toLocaleString()}K)
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const CompanyPayDonut: React.FC<CompanyPayDonutProps> = ({
  breakdown,
  totalCount = 7433,
  onDownloadReport,
  className,
}) => {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Company Pay</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Budget allocation by compensation category</p>
        </div>

        <div className="w-24 shrink-0">
          <SelectField
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            options={[
              { value: '2024', label: '2024' },
              { value: '2025', label: '2025' },
              { value: '2026', label: '2026' },
            ]}
          />
        </div>
      </div>

      {/* Middle: Donut Chart on Left, Legend on Right */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-3 flex-1">
        {/* Recharts Pie Graphic */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomCompanyPayTooltip />} />
              <Pie
                data={breakdown}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={84}
                paddingAngle={4}
                dataKey="percentage"
                stroke="none"
                cornerRadius={3}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {breakdown.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="transition-all duration-300 cursor-pointer"
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Headcount Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {activeIndex !== null ? `${breakdown[activeIndex].percentage}%` : totalCount}
            </span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {activeIndex !== null ? breakdown[activeIndex].name : 'Total Data'}
            </span>
          </div>
        </div>

        {/* 6 Breakdown Items Legend matching Screenshot */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-2 text-xs">
          {breakdown.map((item, idx) => (
            <div
              key={item.name}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                activeIndex === idx
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                {item.percentage < 10 ? `0${item.percentage}%` : `${item.percentage}%`}
              </span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer inside Card */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          2024 Download Report Company Trends and Insights
        </p>

        <Button
          variant="primary"
          size="sm"
          onClick={onDownloadReport}
          className="h-8 px-3 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download Report
        </Button>
      </div>
    </div>
  );
};
