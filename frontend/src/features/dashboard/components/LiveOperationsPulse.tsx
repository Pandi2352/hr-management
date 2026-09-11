import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Users, Award } from 'lucide-react';

interface LiveOperationsPulseProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const LiveOperationsPulse: React.FC<LiveOperationsPulseProps> = ({
  onRefresh,
  isRefreshing = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-md border border-hairline bg-surface/80 backdrop-blur-sm">
      {/* Left: Operational status heartbeat */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Operational Pulse</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              All Systems Optimal
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Live telemetry synced with enterprise database & AI orchestrator
          </p>
        </div>
      </div>

      {/* Right: Telemetry chips & actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md bg-surface-hover border border-hairline text-muted-foreground">
          <Server className="h-3 w-3 text-indigo-400" />
          <span>Core v2.4</span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md bg-surface-hover border border-hairline text-muted-foreground">
          <Users className="h-3 w-3 text-teal-400" />
          <span>Sync Active</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md bg-surface-hover border border-hairline text-muted-foreground">
          <Award className="h-3 w-3 text-amber-400" />
          <span>Gamification Live</span>
        </div>

        <div className="text-xs font-mono font-medium text-foreground px-2.5 py-1 rounded-md bg-surface-hover border border-hairline">
          {currentTime || '00:00:00'}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Intelligence Data"
            className="p-1.5 rounded-md border border-hairline bg-surface hover:bg-surface-hover text-foreground transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};
export default LiveOperationsPulse;
