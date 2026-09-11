import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Crown, Flame, Award, ArrowRight } from 'lucide-react';
import type { LeaderboardEntry } from '../../quiz/types/quiz.types';

interface GamificationLeaderboardCardProps {
  entries?: LeaderboardEntry[];
}

const FALLBACK_CHAMPIONS: LeaderboardEntry[] = [
  {
    rank: 1,
    id: 'emp-1',
    displayName: 'Sarah Jenkins',
    avatarUrl: '',
    departmentName: 'Engineering',
    designationTitle: 'Senior Software Engineer',
    totalXp: 1850,
    level: 7,
    quizzesCompleted: 12,
    perfectScores: 4,
    currentStreak: 6,
    badges: ['Perfect Score', 'Speed Demon'],
  },
  {
    rank: 2,
    id: 'emp-2',
    displayName: 'Michael Chang',
    avatarUrl: '',
    departmentName: 'Product Design',
    designationTitle: 'Lead Product Designer',
    totalXp: 1420,
    level: 5,
    quizzesCompleted: 9,
    perfectScores: 2,
    currentStreak: 4,
    badges: ['Knowledge Seeker'],
  },
  {
    rank: 3,
    id: 'emp-3',
    displayName: 'Elena Rostova',
    avatarUrl: '',
    departmentName: 'Human Resources',
    designationTitle: 'HR Specialist',
    totalXp: 1190,
    level: 4,
    quizzesCompleted: 7,
    perfectScores: 1,
    currentStreak: 3,
    badges: ['First Responder'],
  },
];

export const GamificationLeaderboardCard: React.FC<GamificationLeaderboardCardProps> = ({ entries }) => {
  const topList = entries && entries.length > 0 ? entries.slice(0, 3) : FALLBACK_CHAMPIONS;

  return (
    <div className="rounded-md border border-hairline bg-surface p-5 space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-foreground">Quiz Arena Champions</h3>
              <p className="text-[11px] text-muted-foreground">Gamified skill growth & weekly leaderboard</p>
            </div>
          </div>

          <Link
            to="/quizzes"
            className="text-xs font-semibold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors"
          >
            Arena <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Top 3 Champions List */}
        <div className="space-y-3 mt-4">
          {topList.map((champ, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;

            const crownColor = isFirst
              ? 'text-amber-400'
              : isSecond
              ? 'text-slate-400'
              : 'text-amber-700';

            const badgeBg = isFirst
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-hairline bg-surface-hover';

            return (
              <div
                key={champ.id || idx}
                className={`flex items-center justify-between p-2.5 rounded-md border ${badgeBg} transition-all`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-md bg-surface border border-hairline font-bold font-mono text-xs">
                    {isFirst ? (
                      <Crown className={`h-4 w-4 ${crownColor}`} />
                    ) : (
                      <span className={crownColor}>#{champ.rank || idx + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{champ.displayName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {champ.departmentName || 'All Company'} • Lvl {champ.level}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {champ.currentStreak > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 px-1.5 py-0.5 rounded-md bg-amber-500/10">
                      <Flame className="h-3 w-3" /> {champ.currentStreak}
                    </span>
                  )}
                  <span className="font-mono text-xs font-bold text-foreground">
                    {champ.totalXp.toLocaleString()} <span className="text-[10px] text-muted-foreground font-sans">XP</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gamification Call to Action */}
      <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-indigo-500" /> Active Challenges
        </span>
        <Link
          to="/quizzes"
          className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          Compete Now →
        </Link>
      </div>
    </div>
  );
};
export default GamificationLeaderboardCard;
