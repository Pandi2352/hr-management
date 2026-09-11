import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

interface WorkforceCompositionDonutProps {
  total: number;
}

const COMPOSITION_DATA = [
  { name: 'Full-Time Regular', value: 68, color: '#6366F1' },
  { name: 'Probationary', value: 14, color: '#10B981' },
  { name: 'Contract / Fixed', value: 11, color: '#F59E0B' },
  { name: 'Interns & Fellows', value: 7, color: '#EC4899' },
];

export const WorkforceCompositionDonut: React.FC<WorkforceCompositionDonutProps> = ({ total }) => {
  return (
    <div className="rounded-md border border-hairline bg-surface p-5 space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <PieIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Talent Distribution</h3>
              <p className="text-[11px] text-muted-foreground">Employment contract segmentation</p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-foreground">{total} Active</span>
        </div>

        <div className="relative h-[200px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={COMPOSITION_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                stroke="transparent"
              >
                {COMPOSITION_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value}%`, 'Workforce Share']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">{total}</span>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Members</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-hairline">
        {COMPOSITION_DATA.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{item.name}</p>
              <p className="text-xs font-bold font-mono text-foreground">{item.value}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default WorkforceCompositionDonut;
