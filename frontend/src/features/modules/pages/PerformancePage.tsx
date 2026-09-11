import React, { useState } from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Target, Calendar } from 'lucide-react';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';
import { cn } from '../../../utils/cn';

const GOALS = [
  { id: '1', title: 'Q3 Enterprise Architecture Modernization', owner: 'Sophia Chen', dept: 'Engineering', progress: 85, dueDate: 'Sep 30, 2026', status: 'ON_TRACK' },
  { id: '2', title: 'Candidate Screening AI Pipeline Integration', owner: 'Marcus Brody', dept: 'Product', progress: 92, dueDate: 'Oct 15, 2026', status: 'AHEAD' },
  { id: '3', title: 'Brand Identity & Design System Rollout', owner: 'Priya Sharma', dept: 'Design', progress: 68, dueDate: 'Oct 31, 2026', status: 'ON_TRACK' },
  { id: '4', title: 'ISO 27001 Annual Recertification Audit', owner: 'Alexandre Dubois', dept: 'Compliance', progress: 45, dueDate: 'Nov 15, 2026', status: 'AT_RISK' },
];

export const PerformancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'okrs' | 'reviews'>('okrs');

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Performance & OKRs"
        description="Track organizational key objectives, employee milestones, and quarterly performance reviews."
      />

      <StatTileRow>
        <StatTile label="Active Objectives" value="28" unit="Company Goals" swatch="bg-indigo-500" />
        <StatTile label="Avg Completion" value="78.4%" unit="Q3 Target" swatch="bg-emerald-500" />
        <StatTile label="Reviews Completed" value="94%" unit="Cycle 2026-H1" swatch="bg-violet-500" />
        <StatTile label="Top Performers" value="16" unit="Exceeding" swatch="bg-amber-500" />
      </StatTileRow>

      <div className="rounded-md border border-hairline bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Strategic Objectives & Key Results (OKRs)</h3>
              <p className="text-[11px] text-muted-foreground">Active quarterly objectives mapped across functional departments</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-hover p-0.5 rounded-md border border-hairline">
            <button
              onClick={() => setActiveTab('okrs')}
              className={cn('px-2.5 py-1 text-xs font-semibold rounded-md transition-all', activeTab === 'okrs' ? 'bg-surface text-foreground' : 'text-muted-foreground')}
            >
              OKRs & Goals
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={cn('px-2.5 py-1 text-xs font-semibold rounded-md transition-all', activeTab === 'reviews' ? 'bg-surface text-foreground' : 'text-muted-foreground')}
            >
              Appraisal Cycles
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {GOALS.map((goal) => (
            <div key={goal.id} className="p-3.5 rounded-md border border-hairline bg-surface-hover/50 hover:bg-surface-hover transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground">{goal.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {goal.dept}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Owner: <strong className="text-foreground">{goal.owner}</strong></span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {goal.dueDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 bg-surface-hover rounded-md overflow-hidden border border-hairline">
                  <div
                    className={cn(
                      'h-full rounded-md transition-all duration-500',
                      goal.status === 'AHEAD' ? 'bg-emerald-500' : goal.status === 'ON_TRACK' ? 'bg-indigo-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums text-foreground">{goal.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default PerformancePage;
