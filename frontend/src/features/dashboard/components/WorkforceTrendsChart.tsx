import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface WorkforceTrendsChartProps {
  monthlyHires?: { month: string; count: number }[];
  currentTotal: number;
}

const DEFAULT_TREND_DATA = [
  { month: 'Apr', total: 18, hires: 2, departures: 0 },
  { month: 'May', total: 20, hires: 3, departures: 1 },
  { month: 'Jun', total: 23, hires: 4, departures: 1 },
  { month: 'Jul', total: 25, hires: 3, departures: 1 },
  { month: 'Aug', total: 27, hires: 2, departures: 0 },
  { month: 'Sep', total: 30, hires: 3, departures: 0 },
];

export const WorkforceTrendsChart: React.FC<WorkforceTrendsChartProps> = ({
  monthlyHires,
  currentTotal,
}) => {
  const [metric, setMetric] = useState<'growth' | 'hires'>('growth');

  // Build chart dataset with fallback
  const chartData =
    monthlyHires && monthlyHires.length > 0
      ? monthlyHires.map((item, idx) => ({
          month: item.month,
          hires: item.count,
          total: Math.max(1, currentTotal - (monthlyHires.length - 1 - idx)),
        }))
      : DEFAULT_TREND_DATA;

  return (
    <div className="rounded-md border border-hairline bg-surface p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Workforce Trajectory & Expansion</h3>
            <p className="text-[11px] text-muted-foreground">Historical growth velocity & talent acquisition pipeline (Current: {currentTotal})</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-0.5 rounded-md border border-hairline bg-surface-hover self-start sm:self-auto">
          <button
            onClick={() => setMetric('growth')}
            className={`px-2.5 py-1 text-xs font-semibold rounded ${
              metric === 'growth'
                ? 'bg-surface text-foreground shadow-none'
                : 'text-muted-foreground hover:text-foreground'
            } transition-all`}
          >
            Total Headcount
          </button>
          <button
            onClick={() => setMetric('hires')}
            className={`px-2.5 py-1 text-xs font-semibold rounded ${
              metric === 'hires'
                ? 'bg-surface text-foreground shadow-none'
                : 'text-muted-foreground hover:text-foreground'
            } transition-all`}
          >
            New Hires
          </button>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="hiresGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
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
            {metric === 'growth' ? (
              <Area
                type="monotone"
                dataKey="total"
                name="Total Employees"
                stroke="#6366F1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#growthGradient)"
              />
            ) : (
              <Area
                type="monotone"
                dataKey="hires"
                name="New Hires"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#hiresGradient)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default WorkforceTrendsChart;
