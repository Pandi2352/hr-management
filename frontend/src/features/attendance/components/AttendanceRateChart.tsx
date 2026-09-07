import React from 'react';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';
import type { MonthlyAttendanceRate } from '../types/attendance.types';

interface AttendanceRateChartProps {
  data: MonthlyAttendanceRate[];
  onDownloadReport?: () => void;
  className?: string;
}

// Custom Tooltip for Stacked Bar Chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
    return (
      <div className="rounded-md bg-slate-900/95 dark:bg-slate-800/95 text-white px-3 py-2 shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[150px]">
        <div className="font-bold text-slate-100 border-b border-slate-700/80 pb-1 mb-1.5 flex items-center justify-between">
          <span>{label} Attendance</span>
          <span className="text-[10px] text-slate-400">{total}% Total</span>
        </div>
        <div className="space-y-1 text-[11px]">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name === 'onTime'
                  ? 'On Time'
                  : entry.name === 'late'
                  ? 'Late Arrival'
                  : 'Absent'}
                :
              </span>
              <span className="font-bold tabular-nums" style={{ color: entry.color }}>
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const AttendanceRateChart: React.FC<AttendanceRateChartProps> = ({
  data,
  onDownloadReport,
  className,
}) => {
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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Rate</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Monthly punctuality, late arrivals & absence distribution
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadReport}
          className="rounded-md h-8 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs"
        >
          <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
          Download Report
        </Button>
      </div>

      {/* Recharts Stacked Bar Chart */}
      <div className="w-full h-64 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={14}
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
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              unit="%"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />

            {/* Stacked Bars: Bottom (On Time), Middle (Late), Top (Absent) */}
            <Bar
              dataKey="onTime"
              stackId="attendance"
              fill="#2563eb"
              name="onTime"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="late"
              stackId="attendance"
              fill="#f59e0b"
              name="late"
            />
            <Bar
              dataKey="absent"
              stackId="attendance"
              fill="#94a3b8"
              name="absent"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
          <span>On Time</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
          <span>Late</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
          <span>Absent</span>
        </div>
      </div>
    </div>
  );
};
