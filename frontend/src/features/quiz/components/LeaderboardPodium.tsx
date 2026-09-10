import React from 'react';
import { Trophy, Medal, Flame, Zap, Award, Target } from 'lucide-react';
import type { LeaderboardEntry } from '../types/quiz.types';

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
  currentEmployeeId?: string;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  entries,
  currentEmployeeId,
}) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-surface border border-hairline rounded-md">
        <div className="w-12 h-12 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">No Leaderboard Data Yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Complete quizzes to earn XP points, gain ranks, and claim your spot on the company podium!
        </p>
      </div>
    );
  }

  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  const renderPodiumCard = (
    entry: LeaderboardEntry | undefined,
    place: 1 | 2 | 3,
    colorClass: string,
    borderClass: string,
    badgeBg: string,
    heightClass: string
  ) => {
    if (!entry) {
      return (
        <div
          className={`flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-hairline rounded-md bg-surface-hover/10 opacity-40 ${heightClass}`}
        >
          <div className="text-xs text-muted-foreground font-medium">Rank #{place} Open</div>
        </div>
      );
    }

    const isCurrent = currentEmployeeId && entry.id === currentEmployeeId;

    return (
      <div
        className={`flex-1 flex flex-col items-center justify-between p-5 border rounded-md bg-surface transition-all ${
          isCurrent ? 'ring-2 ring-brand-500 border-brand-500' : borderClass
        } ${heightClass}`}
      >
        {/* Top place badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${badgeBg}`}
          >
            {place === 1 ? (
              <Trophy className="w-4 h-4 text-amber-400" />
            ) : (
              <Medal className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {place === 1 ? '1st Place' : place === 2 ? '2nd Place' : '3rd Place'}
          </span>
        </div>

        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2">
            {entry.avatarUrl ? (
              <img
                src={entry.avatarUrl}
                alt={entry.displayName}
                className="w-14 h-14 rounded-full object-cover border-2 border-surface"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-brand-500/15 text-brand-600 font-bold text-lg flex items-center justify-center border-2 border-surface">
                {entry.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-surface border border-hairline text-[10px] font-bold text-foreground flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 text-amber-500" />
              Lvl {entry.level}
            </div>
          </div>
          <h4 className="text-sm font-semibold text-foreground line-clamp-1">
            {entry.displayName}
          </h4>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{entry.departmentName}</p>
        </div>

        {/* XP & Stats */}
        <div className="w-full mt-3 pt-3 border-t border-hairline flex items-center justify-around text-center">
          <div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Score</div>
            <div className={`text-sm font-extrabold ${colorClass}`}>
              {entry.totalXp.toLocaleString()} XP
            </div>
          </div>
          <div className="w-px h-6 bg-hairline" />
          <div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Quizzes</div>
            <div className="text-xs font-bold text-foreground flex items-center justify-center gap-1">
              <Target className="w-3 h-3 text-emerald-500" />
              {entry.quizzesCompleted}
            </div>
          </div>
          {entry.currentStreak > 0 && (
            <>
              <div className="w-px h-6 bg-hairline" />
              <div>
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">Streak</div>
                <div className="text-xs font-bold text-orange-500 flex items-center justify-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  {entry.currentStreak}x
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* 2nd Place (Silver) */}
        <div className="order-2 md:order-1">
          {renderPodiumCard(
            top2,
            2,
            'text-slate-400 dark:text-slate-300',
            'border-slate-400/30 bg-slate-500/5',
            'bg-slate-400/20 text-slate-400',
            'min-h-[220px]'
          )}
        </div>

        {/* 1st Place (Gold) - Elevated height */}
        <div className="order-1 md:order-2">
          {renderPodiumCard(
            top1,
            1,
            'text-amber-500 dark:text-amber-400',
            'border-amber-500/40 bg-amber-500/5 shadow-none',
            'bg-amber-500/20 text-amber-500',
            'min-h-[240px]'
          )}
        </div>

        {/* 3rd Place (Bronze) */}
        <div className="order-3 md:order-3">
          {renderPodiumCard(
            top3,
            3,
            'text-amber-700 dark:text-amber-600',
            'border-amber-700/30 bg-amber-700/5',
            'bg-amber-700/20 text-amber-700',
            'min-h-[220px]'
          )}
        </div>
      </div>

      {/* Ranks Table (Top 50) */}
      <div className="border border-hairline rounded-md bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-surface-hover/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Overall Rankings
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">{entries.length} Champions Ranked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-hairline bg-surface-hover/20 text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-4 w-16 text-center">Rank</th>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4 text-center">Level</th>
                <th className="py-2.5 px-4 text-center">Quizzes</th>
                <th className="py-2.5 px-4 text-center">Accuracy</th>
                <th className="py-2.5 px-4 text-center">Badges</th>
                <th className="py-2.5 px-4 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {entries.map((entry) => {
                const isCurrent = currentEmployeeId && entry.id === currentEmployeeId;
                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-brand-500/10 font-medium'
                        : 'hover:bg-surface-hover/40'
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-bold">
                      {entry.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/30">
                          1
                        </span>
                      ) : entry.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-400/20 text-slate-400 border border-slate-400/30">
                          2
                        </span>
                      ) : entry.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-700/20 text-amber-700 border border-amber-700/30">
                          3
                        </span>
                      ) : (
                        <span className="text-muted-foreground">#{entry.rank}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-600 font-bold text-xs flex items-center justify-center">
                            {entry.displayName?.[0] || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {entry.displayName}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-brand-500 text-white rounded-md">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{entry.departmentName}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-hover border border-hairline font-semibold text-foreground">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Lvl {entry.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-foreground">
                      {entry.quizzesCompleted}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {entry.perfectScores}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Award className="w-3.5 h-3.5 text-brand-500" />
                        {entry.badges?.length || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-brand-600 dark:text-brand-400">
                      {entry.totalXp.toLocaleString()} XP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
