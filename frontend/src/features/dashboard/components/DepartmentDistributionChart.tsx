import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Building2, ArrowUpDown } from 'lucide-react';

export interface DepartmentData {
  departmentId: string | null;
  name: string;
  count: number;
}

interface DepartmentDistributionChartProps {
  data: DepartmentData[];
  total: number;
}

const PALETTE = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const FALLBACK_DEPARTMENTS: DepartmentData[] = [
  { departmentId: 'd-1', name: 'Engineering', count: 12 },
  { departmentId: 'd-2', name: 'Product & UX', count: 6 },
  { departmentId: 'd-3', name: 'Sales & Growth', count: 5 },
  { departmentId: 'd-4', name: 'Human Resources', count: 4 },
  { departmentId: 'd-5', name: 'Operations', count: 3 },
];

export const DepartmentDistributionChart: React.FC<DepartmentDistributionChartProps> = ({
  data,
  total,
}) => {
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');

  const rawData = data && data.length > 0 ? data : FALLBACK_DEPARTMENTS;
  const computedTotal = total > 0 ? total : rawData.reduce((acc, curr) => acc + curr.count, 0);

  const chartData = [...rawData].sort((a, b) => {
    if (sortBy === 'count') return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="rounded-md border border-hairline bg-surface/90 backdrop-blur-sm p-5 space-y-4 h-full flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Departmental Allocation & Density</h3>
            <p className="text-[11px] text-muted-foreground">Distribution of employees across organizational units</p>
          </div>
        </div>

        <button
          onClick={() => setSortBy(sortBy === 'count' ? 'name' : 'count')}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-hover border border-hairline text-foreground transition-all self-start sm:self-auto"
        >
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          <span>Sort by {sortBy === 'count' ? 'Headcount' : 'Name'}</span>
        </button>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.08} />
            <XAxis type="number" stroke="currentColor" opacity={0.6} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              dataKey="name"
              type="category"
              stroke="currentColor"
              opacity={0.8}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={90}
            />
            <Tooltip
              formatter={(value: any) => [
                `${value} (${computedTotal > 0 ? Math.round(((Number(value) || 0) / computedTotal) * 100) : 0}%)`,
                'Employees',
              ]}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default DepartmentDistributionChart;
