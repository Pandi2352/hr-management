import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Users2, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PipelineStage {
  stage: string;
  candidates: number;
  conversion: string;
  fill: string;
}

const PIPELINE_DATA: PipelineStage[] = [
  { stage: 'Sourced', candidates: 52, conversion: '100%', fill: '#6366F1' },
  { stage: 'Screened', candidates: 34, conversion: '65.4%', fill: '#06B6D4' },
  { stage: 'Interview', candidates: 18, conversion: '34.6%', fill: '#F59E0B' },
  { stage: 'Offered', candidates: 7, conversion: '13.5%', fill: '#EC4899' },
  { stage: 'Hired', candidates: 5, conversion: '9.6%', fill: '#10B981' },
];

export const RecruitmentPipelineChart: React.FC = () => {
  return (
    <div className="rounded-md border border-hairline bg-surface/90 backdrop-blur-sm p-5 space-y-4 h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Users2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Talent Acquisition & Pipeline</h3>
              <p className="text-[11px] text-muted-foreground">Candidate conversion funnel through recruitment stages</p>
            </div>
          </div>

          <Link
            to="/recruitment/jobs"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink transition-colors self-start sm:self-auto"
          >
            <span>Active Roles (8)</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="h-[220px] w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={PIPELINE_DATA}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" stroke="currentColor" opacity={0.5} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="stage"
                type="category"
                stroke="currentColor"
                opacity={0.8}
                tick={{ fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={75}
              />
              <Tooltip
                formatter={(value: any, _name: any, item: any) => [
                  `${value} Candidates (Conv: ${item.payload.conversion})`,
                  'Stage Count',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="candidates" radius={[0, 4, 4, 0]}>
                {PIPELINE_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 pt-3 border-t border-hairline text-center">
        {PIPELINE_DATA.map((s) => (
          <div key={s.stage} className="px-1 py-1 rounded bg-surface-hover/60">
            <div className="text-[10px] text-ink-3 truncate">{s.stage}</div>
            <div className="text-[12px] font-bold text-ink mt-0.5">{s.candidates}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
