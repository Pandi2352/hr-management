import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Upload,
  FileCheck,
} from 'lucide-react';
import { useToast } from '../../../components/ui/toast';
import { attendanceApi } from '../api/attendance.api';
import type { AttendanceRecord } from '../types/attendance.types';

interface Props {
  myRecords?: AttendanceRecord[];
  onSubmitted?: () => void;
  onViewPendingClick?: () => void;
}

export function AttendanceRegularizationWizard({
  myRecords = [],
  onSubmitted,
  onViewPendingClick,
}: Props) {
  const toast = useToast();
  const today = new Date();

  // Calendar month navigation
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonthIdx, setCurrentMonthIdx] = useState(today.getMonth()); // 0-indexed

  // Selected date range
  const todayIso = today.toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);

  // Punch in/out hours & minutes
  const [startHours, setStartHours] = useState('09');
  const [startMinutes, setStartMinutes] = useState('30');
  const [endHours, setEndHours] = useState('18');
  const [endMinutes, setEndMinutes] = useState('30');

  // Comments and attachment
  const [comments, setComments] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIdx === 0) {
      setCurrentMonthIdx(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIdx((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIdx === 11) {
      setCurrentMonthIdx(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIdx((m) => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Build calendar matrix
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 = Sun
    const daysInCurrMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonthIdx, 0).getDate();

    const mStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

    // Map records for quick lookup
    const recordsMap = new Map<string, AttendanceRecord>();
    for (const r of myRecords) {
      recordsMap.set(r.date, r);
    }

    const cells = [];

    // Preceding days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({
        day: d,
        isCurrentMonth: false,
        iso: '',
        isToday: false,
        status: 'MUTED',
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrMonth; d++) {
      const iso = `${mStr}-${String(d).padStart(2, '0')}`;
      const isTodayDate = iso === todayIso;
      const rec = recordsMap.get(iso);

      let status = 'NORMAL';
      if (isTodayDate) {
        status = 'TODAY';
      } else if (rec) {
        if (rec.isHalfDay || rec.status === 'HALF_DAY' || (rec.workMinutes && rec.workMinutes >= 240 && rec.workMinutes < 480)) {
          status = 'HALF_DAY';
        } else if (rec.status === 'PRESENT') {
          status = 'PRESENT';
        }
      } else if (iso < todayIso) {
        const dayOfWeek = new Date(currentYear, currentMonthIdx, d).getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          status = 'ABSENT';
        }
      }

      cells.push({
        day: d,
        isCurrentMonth: true,
        iso,
        isToday: isTodayDate,
        status,
      });
    }

    // Trailing days from next month to complete row of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        iso: '',
        isToday: false,
        status: 'MUTED',
      });
    }

    return cells;
  }, [currentYear, currentMonthIdx, myRecords, todayIso]);

  // Calculate duration between Start and End time
  const { totalHours, totalMinutes, isValidTime, diffMinutes } = useMemo(() => {
    const sH = parseInt(startHours, 10) || 0;
    const sM = parseInt(startMinutes, 10) || 0;
    const eH = parseInt(endHours, 10) || 0;
    const eM = parseInt(endMinutes, 10) || 0;

    const startTotal = sH * 60 + sM;
    const endTotal = eH * 60 + eM;

    const diff = endTotal - startTotal;
    if (diff <= 0) {
      return { totalHours: 0, totalMinutes: 0, isValidTime: false, diffMinutes: 0 };
    }

    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return { totalHours: h, totalMinutes: m, isValidTime: true, diffMinutes: diff };
  }, [startHours, startMinutes, endHours, endMinutes]);

  // Click day on calendar
  const handleSelectDay = (cell: typeof calendarCells[0]) => {
    if (!cell.isCurrentMonth || !cell.iso) return;
    if (cell.iso > todayIso) {
      toast.error('Cannot select future dates for attendance regularization.');
      return;
    }
    setFromDate(cell.iso);
    setToDate(cell.iso);
  };

  // Submit regularization
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate) {
      toast.error('Please select a date.');
      return;
    }
    if (fromDate > todayIso) {
      toast.error('Cannot regularize future dates.');
      return;
    }
    if (!isValidTime) {
      toast.error('End time must be after start time.');
      return;
    }
    if (!comments.trim()) {
      toast.error('Please enter comments/reason for attendance regularization.');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestedCheckIn = `${startHours.padStart(2, '0')}:${startMinutes.padStart(2, '0')}`;
      const requestedCheckOut = `${endHours.padStart(2, '0')}:${endMinutes.padStart(2, '0')}`;

      await attendanceApi.raiseRegularization({
        date: fromDate,
        requestedCheckIn,
        requestedCheckOut,
        reason: comments.trim(),
      });

      toast.success(`Attendance Regularization request submitted for ${fromDate}.`);
      setComments('');
      setFileName(null);
      if (onSubmitted) onSubmitted();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to submit regularization request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
      {/* Header instruction matching image 1 */}
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Select day(s) for which you wish to apply for "attendance regularization" request.
        </p>
      </div>

      {/* Monthly Calendar matching Image 1 */}
      <div className="rounded-md border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Month Navigation */}
        <div className="flex items-center justify-between pb-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md text-emerald-800 dark:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 font-bold" />
          </button>
          <span className="text-base font-bold text-emerald-900 dark:text-emerald-300">
            {monthNames[currentMonthIdx]} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-md text-emerald-800 dark:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5 font-bold" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-700 dark:text-slate-300 py-2">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
          {calendarCells.map((cell, idx) => {
            const isSelected = cell.iso && (cell.iso === fromDate || cell.iso === toDate);

            return (
              <div key={idx} className="flex items-center justify-center py-1">
                {cell.isCurrentMonth ? (
                  <button
                    type="button"
                    onClick={() => handleSelectDay(cell)}
                    disabled={cell.iso > todayIso}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                      isSelected
                        ? 'bg-emerald-800 text-white font-bold'
                        : cell.status === 'TODAY'
                        ? 'border border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40'
                        : cell.status === 'ABSENT'
                        ? 'border border-rose-500 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-50'
                        : cell.status === 'HALF_DAY'
                        ? 'border border-blue-500 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50'
                        : cell.iso > todayIso
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cell.day}
                  </button>
                ) : (
                  <span className="text-slate-300 dark:text-slate-700 select-none">
                    {cell.day}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar Legend matching Image 1 */}
        <div className="mt-4 pt-3 border-t border-dotted border-slate-300 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-3.5 h-3.5 border border-emerald-600 rounded-xs bg-white dark:bg-slate-900 inline-block" />
              Today
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-3.5 h-3.5 border border-rose-500 rounded-xs bg-white dark:bg-slate-900 inline-block" />
              Absent
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-3.5 h-3.5 border border-blue-500 rounded-xs bg-white dark:bg-slate-900 inline-block" />
              Half day absent
            </span>
          </div>

          {onViewPendingClick && (
            <button
              type="button"
              onClick={onViewPendingClick}
              className="font-semibold text-emerald-800 dark:text-emerald-400 underline hover:text-emerald-700 text-xs"
            >
              View pending request
            </button>
          )}
        </div>
      </div>

      {/* Form Fields matching Image 2 */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Date pickers row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              * From date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                max={todayIso}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              * To date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                max={todayIso}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Start and End Times grid matching Image 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              * Start Hours
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={startHours}
              onChange={(e) => setStartHours(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              * Start Minutes
            </label>
            <input
              type="number"
              min="0"
              max="59"
              value={startMinutes}
              onChange={(e) => setStartMinutes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              * End hours
            </label>
            <input
              type="number"
              min="0"
              max="23"
              value={endHours}
              onChange={(e) => setEndHours(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              * End Minutes
            </label>
            <input
              type="number"
              min="0"
              max="59"
              value={endMinutes}
              onChange={(e) => setEndMinutes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Note Callout matching Image 2 */}
        <div className="rounded-md border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 px-3.5 py-2.5 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">
              Note : You are marking AR for {isValidTime ? `${totalHours} hours ${totalMinutes} minutes` : '0 hours 0 minutes'}
            </span>
          </div>
          {isValidTime && (
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              diffMinutes >= 480
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                : diffMinutes >= 240
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200'
            }`}>
              {diffMinutes >= 480 ? 'Full Day (8h+)' : diffMinutes >= 240 ? 'Half Day (4h - 8h)' : 'Short Duration (< 4h)'}
            </span>
          )}
        </div>

        {/* Comments field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            * Comments
          </label>
          <input
            type="text"
            required
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter reason for attendance regularization (e.g. on-site client visit, biometric failure)"
            className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-600 border-b-2"
          />
        </div>

        {/* Attachment Upload Button matching Image 2 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Attachment
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-emerald-800 hover:bg-emerald-700 text-white transition-colors">
              <Upload className="w-3.5 h-3.5" />
              UPLOAD FILE
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFileName(f.name);
                }}
              />
            </label>
            {fileName && (
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                {fileName}
              </span>
            )}
          </div>
        </div>

        {/* AR Balance and Submit Action matching Image 2 */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            AR balance : <strong className="text-slate-900 dark:text-white font-bold">30/Monthly</strong>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold rounded-md bg-emerald-800 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Regularization Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
