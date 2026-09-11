import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SKILLS_DATA = [
  { subject: 'AI & Automations', score: 86, fullMark: 100 },
  { subject: 'Security & Auth', score: 94, fullMark: 100 },
  { subject: 'Frontend & UI', score: 91, fullMark: 100 },
  { subject: 'Cloud & DevOps', score: 88, fullMark: 100 },
  { subject: 'Leadership', score: 82, fullMark: 100 },
  { subject: 'Compliance', score: 96, fullMark: 100 },
];

export const SkillMasteryChart: React.FC = () => {
  return (
    <div className="rounded-md border border-hairline bg-surface/90 backdrop-blur-sm p-5 space-y-4 h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Organizational Skill & Competency Matrix</h3>
              <p className="text-[11px] text-muted-foreground">Competency benchmarks and learning indices across departments</p>
            </div>
          </div>

          <Link
            to="/quizzes"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-2 hover:text-ink transition-colors self-start sm:self-auto"
          >
            <span>Assess Skills</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="relative h-[220px] w-full mt-2 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={SKILLS_DATA}>
              <PolarGrid stroke="currentColor" opacity={0.12} />
              <PolarAngleAxis dataKey="subject" stroke="currentColor" opacity={0.7} tick={{ fontSize: 10, fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="currentColor" opacity={0.3} tick={{ fontSize: 9 }} />
              <Radar
                name="Proficiency Score"
                dataKey="score"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.4}
              />
              <Tooltip
                formatter={(value: any) => [`${value}%`, 'Team Proficiency']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-hairline">
        <div className="p-2 rounded bg-surface-hover/60 text-center">
          <span className="text-[10px] text-ink-3">Avg Mastery</span>
          <p className="text-[13px] font-bold text-purple-600 dark:text-purple-400">89.5%</p>
        </div>
        <div className="p-2 rounded bg-surface-hover/60 text-center">
          <span className="text-[10px] text-ink-3">Target KPI</span>
          <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">&gt;85.0%</p>
        </div>
        <div className="p-2 rounded bg-surface-hover/60 text-center">
          <span className="text-[10px] text-ink-3">Certified</span>
          <p className="text-[13px] font-bold text-amber-600 dark:text-amber-400">92% Team</p>
        </div>
      </div>
    </div>
  );
};
