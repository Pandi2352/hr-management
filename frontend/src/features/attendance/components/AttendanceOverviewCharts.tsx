import { useState } from 'react';
import { Download, MoreHorizontal, Users, CheckCircle2, Clock, XCircle, Palmtree } from 'lucide-react';

export interface MonthlyRate {
  month?: string;
  label?: string;
  monthIndex?: number;
  onTimePct?: number;
  onTimeRate?: number;
  latePct?: number;
  lateRate?: number;
  absentPct?: number;
  absentRate?: number;
  totalWorkingDays?: number;
  presentCount?: number;
  lateCount?: number;
  absentCount?: number;
  total?: number;
}

export interface EmployeeTypeSummary {
  total: number;
  onsite: number;
  remote: number;
  hybrid: number;
  onsitePct: number;
  remotePct: number;
  hybridPct: number;
}

export interface TodayKpis {
  totalEmployees: number;
  presentCount: number;
  presentPct: number;
  lateCount: number;
  absentCount: number;
  onLeaveCount: number;
  avgWorkHours: number;
}

interface Props {
  monthlyRates: MonthlyRate[];
  employeeType: EmployeeTypeSummary;
  todayKpis?: TodayKpis;
  year: number;
  onYearChange?: (year: number) => void;
  onDownloadReport?: () => void;
}

export function AttendanceOverviewCharts({
  monthlyRates,
  employeeType,
  todayKpis,
  year,
  onDownloadReport,
}: Props) {
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyRate | null>(null);

  // SVG Donut calculation
  const total = employeeType.total || 1;
  const onsiteAngle = (employeeType.onsite / total) * 360;
  const remoteAngle = (employeeType.remote / total) * 360;
  const hybridAngle = (employeeType.hybrid / total) * 360;

  // Donut arc helper
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const onsiteDash = (onsiteAngle / 360) * circumference;
  const remoteDash = (remoteAngle / 360) * circumference;
  const hybridDash = (hybridAngle / 360) * circumference;

  // Offsets
  const onsiteOffset = 0;
  const remoteOffset = -onsiteDash;
  const hybridOffset = -(onsiteDash + remoteDash);

  return (
    <div className="space-y-4">
      {/* Top row: 2 main cards matching uploaded screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Attendance Rate (8 cols on lg) */}
        <div className="lg:col-span-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Attendance Rate
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Annual overview of employee attendance behavior ({year})
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Download Report
            </button>
          </div>

          {/* Chart area */}
          <div className="relative pt-6 pb-2">
            {/* Tooltip */}
            {hoveredMonth && (
              <div className="absolute top-1 right-2 z-10 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 text-xs shadow-none">
                <div className="font-bold text-slate-200 pb-1 border-b border-slate-700 mb-1">
                  {hoveredMonth.label || hoveredMonth.month} {year}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <span className="text-blue-400">On Time: {hoveredMonth.onTimeRate ?? hoveredMonth.onTimePct ?? 0}%</span>
                  <span className="text-amber-400">Late: {hoveredMonth.lateRate ?? hoveredMonth.latePct ?? 0}%</span>
                  <span className="text-slate-300">Absent: {hoveredMonth.absentRate ?? hoveredMonth.absentPct ?? 0}%</span>
                </div>
              </div>
            )}

            {/* Y Axis gridlines and bars */}
            <div className="flex h-56 w-full">
              {/* Y Axis Labels */}
              <div className="flex flex-col justify-between pr-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none pb-6">
                <span>100%</span>
                <span>80%</span>
                <span>60%</span>
                <span>40%</span>
                <span>20%</span>
                <span>0%</span>
              </div>

              {/* Bars container */}
              <div className="relative flex-1 flex flex-col justify-between">
                {/* Horizontal guide lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 w-full" />
                  <div className="border-b border-slate-100 dark:border-slate-800/80 w-full" />
                  <div className="border-b border-slate-100 dark:border-slate-800/80 w-full" />
                  <div className="border-b border-slate-100 dark:border-slate-800/80 w-full" />
                  <div className="border-b border-slate-100 dark:border-slate-800/80 w-full" />
                  <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
                </div>

                {/* 12 stacked vertical bars */}
                <div className="relative z-1 flex items-end justify-between h-full px-2 pb-6">
                  {monthlyRates.map((m, idx) => {
                    const onTime = m.onTimeRate ?? m.onTimePct ?? 0;
                    const late = m.lateRate ?? m.latePct ?? 0;
                    const absent = m.absentRate ?? m.absentPct ?? 0;
                    const totalPct = onTime + late + absent;
                    const safeTotal = totalPct > 0 ? totalPct : 100;
                    const onTimeH = (onTime / safeTotal) * 100;
                    const lateH = (late / safeTotal) * 100;
                    const absentH = (absent / safeTotal) * 100;
                    const label = m.label || m.month || `M${idx + 1}`;

                    return (
                      <div
                        key={label}
                        className="flex flex-col items-center group cursor-pointer h-full justify-end"
                        onMouseEnter={() => setHoveredMonth(m)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        {/* Bar column (10-14px wide) */}
                        <div className="w-3 sm:w-3.5 md:w-4 flex flex-col-reverse h-full max-h-[190px] rounded-t-md rounded-b-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                          {/* Bottom segment: One Time (Blue) */}
                          <div
                            style={{ height: `${onTimeH}%` }}
                            className="w-full bg-blue-600 transition-all duration-300 group-hover:brightness-110"
                            title={`On Time: ${onTime}%`}
                          />
                          {/* Middle segment: Late (Orange) */}
                          <div
                            style={{ height: `${lateH}%` }}
                            className="w-full bg-amber-500 transition-all duration-300 group-hover:brightness-110"
                            title={`Late: ${late}%`}
                          />
                          {/* Top segment: Absent (Slate / Indigo) */}
                          <div
                            style={{ height: `${absentH}%` }}
                            className="w-full bg-slate-400 dark:bg-slate-500 transition-all duration-300 group-hover:brightness-110"
                            title={`Absent: ${absent}%`}
                          />
                        </div>

                        {/* Month name label */}
                        <span className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 transition-colors">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend at bottom center */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                One Time
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Late
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" />
                Absent
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Employee Type Donut (4 cols on lg) */}
        <div className="lg:col-span-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Employee Type
            </h3>
            <button
              type="button"
              aria-label="Options"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Donut graphic */}
          <div className="relative flex items-center justify-center py-6">
            <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background circle track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="18"
                fill="transparent"
              />

              {/* Onsite segment (Blue) */}
              {employeeType.onsite > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#2563eb"
                  strokeWidth="18"
                  strokeDasharray={`${onsiteDash} ${circumference}`}
                  strokeDashoffset={onsiteOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              )}

              {/* Remote segment (Orange) */}
              {employeeType.remote > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#f97316"
                  strokeWidth="18"
                  strokeDasharray={`${remoteDash} ${circumference}`}
                  strokeDashoffset={remoteOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              )}

              {/* Hybrid segment (Cyan) */}
              {employeeType.hybrid > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#06b6d4"
                  strokeWidth="18"
                  strokeDasharray={`${hybridDash} ${circumference}`}
                  strokeDashoffset={hybridOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              )}
            </svg>

            {/* Centered text in donut hole */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">
                {employeeType.total}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wide">
                Employee
              </span>
            </div>
          </div>

          {/* Legend below donut matching image */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-center gap-6 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                {employeeType.onsite} Onsite
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                {employeeType.remote} Remote
              </span>
            </div>
            <div className="flex items-center justify-center text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                {employeeType.hybrid} Hybrid
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      {todayKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {todayKpis.presentCount} <span className="text-xs font-semibold text-emerald-600">({todayKpis.presentPct}%)</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Present Today</div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {todayKpis.lateCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Late Today</div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {todayKpis.absentCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Absent Today</div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {todayKpis.onLeaveCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">On Leave</div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {todayKpis.avgWorkHours}h
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Avg Work Hours</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
