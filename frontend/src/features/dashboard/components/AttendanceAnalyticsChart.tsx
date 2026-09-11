import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ClockCheck } from 'lucide-react';

const ATTENDANCE_TRENDS = [
  { day: 'Mon', onTime: 24, late: 2, leave: 2, punctuality: 92 },
  { day: 'Tue', onTime: 25, late: 1, leave: 2, punctuality: 96 },
  { day: 'Wed', onTime: 26, late: 1, leave: 1, punctuality: 96 },
  { day: 'Thu', onTime: 23, late: 3, leave: 2, punctuality: 88 },
  { day: 'Fri', onTime: 22, late: 2, leave: 4, punctuality: 91 },
];

export const AttendanceAnalyticsChart: React.FC = () => {
  return (
    <div className="rounded-md border border-hairline bg-surface p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <ClockCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Attendance & Punctuality Dynamics</h3>
            <p className="text-[11px] text-muted-foreground">Daily attendance check-ins alongside organization punctuality rate</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 92.6% Weekly Avg
          </span>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={ATTENDANCE_TRENDS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="day" stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[70, 100]} stroke="#10B981" opacity={0.6} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconType="circle" iconSize={8} />
            <Bar yAxisId="left" dataKey="onTime" name="On Time" fill="#14B8A6" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar yAxisId="left" dataKey="late" name="Late Check-in" fill="#F59E0B" radius={[0, 0, 0, 0]} stackId="a" />
            <Bar yAxisId="left" dataKey="leave" name="On Approved Leave" fill="#94A3B8" radius={[4, 4, 0, 0]} stackId="a" />
            <Line yAxisId="right" type="monotone" dataKey="punctuality" name="Punctuality %" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default AttendanceAnalyticsChart;
