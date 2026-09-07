import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { cn } from '../../../utils/cn';
import type { EmployeeTypeDistribution } from '../types/attendance.types';

interface EmployeeTypeDonutProps {
  distribution: EmployeeTypeDistribution;
  className?: string;
}

const COLORS = {
  onsite: '#2563eb', // Blue / Violet
  remote: '#f59e0b', // Amber / Orange
  hybrid: '#06b6d4', // Cyan / Teal
};

// Custom Tooltip for Recharts Pie
const CustomPieTooltip = ({ active, payload }: any) => {
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
          <span className="font-bold text-white tabular-nums">{data.value} Staff</span>
        </div>
      </div>
    );
  }
  return null;
};

export const EmployeeTypeDonut: React.FC<EmployeeTypeDonutProps> = ({
  distribution,
  className,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { onsite, remote, hybrid, total } = distribution;

  const chartData = [
    { name: 'Onsite', value: onsite, color: COLORS.onsite, key: 'onsite' },
    { name: 'Remote', value: remote, color: COLORS.remote, key: 'remote' },
    { name: 'Hybrid', value: hybrid, color: COLORS.hybrid, key: 'hybrid' },
  ];

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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Employee Type</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Workplace mode distribution</p>
        </div>
        <button
          type="button"
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Donut Graphic using Recharts */}
      <div className="relative w-full h-64 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomPieTooltip />} />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={92}
              paddingAngle={6}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, index) => (
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
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {activeIndex !== null ? chartData[activeIndex].value : total}
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
            {activeIndex !== null ? `${chartData[activeIndex].name} Staff` : 'Employee'}
          </span>
        </div>
      </div>

      {/* Legend with Headcounts */}
      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-center gap-6">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              activeIndex === 0 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'
            }`}
            onMouseEnter={() => setActiveIndex(0)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb] shrink-0" />
            <span>{onsite} Onsite</span>
          </div>

          <div
            className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              activeIndex === 1 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-300'
            }`}
            onMouseEnter={() => setActiveIndex(1)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b] shrink-0" />
            <span>{remote} Remote</span>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              activeIndex === 2 ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-slate-700 dark:text-slate-300'
            }`}
            onMouseEnter={() => setActiveIndex(2)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#06b6d4] shrink-0" />
            <span>{hybrid} Hybrid</span>
          </div>
        </div>
      </div>
    </div>
  );
};
