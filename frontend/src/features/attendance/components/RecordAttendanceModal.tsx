import { useState } from 'react';
import { X } from 'lucide-react';
import type { SheetEmployee } from './AttendanceMatrixSheet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employees: SheetEmployee[];
  onSave: (payload: {
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    status?: string;
    note?: string;
  }) => Promise<void>;
}

export function RecordAttendanceModal({ isOpen, onClose, employees, onSave }: Props) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.employeeId || '');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('18:00');
  const [status, setStatus] = useState<'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'OPEN'>('PRESENT');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live duration calculation
  const durationInfo = (() => {
    if (!checkIn || !checkOut) return null;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) return null;
    return {
      minutes: diff,
      hours: Math.floor(diff / 60),
      remMinutes: diff % 60,
      isFullDay: diff >= 480,
      isHalfDay: diff >= 240 && diff < 480,
      isShort: diff < 240,
    };
  })();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('Please select an employee');
      return;
    }
    if (!date) {
      setError('Please select a date');
      return;
    }
    if (!checkIn) {
      setError('Punch-in time is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // If checkOut is provided, determine effective status automatically unless user chose OPEN
      let effectiveStatus = status;
      if (checkOut && durationInfo && status !== 'OPEN') {
        effectiveStatus = durationInfo.isHalfDay ? 'HALF_DAY' : (durationInfo.isShort ? 'ABSENT' : 'PRESENT');
      }

      await onSave({
        employeeId,
        date,
        checkIn,
        checkOut: checkOut || undefined,
        status: effectiveStatus,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Record Attendance Punch
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Record or adjust employee attendance record
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="">Choose an employee...</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.name} ({emp.employeeCode}) {emp.department ? `· ${emp.department}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Punch In Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Punch Out Time
              </label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Live Duration Callout */}
          {durationInfo && (
            <div className={`p-2.5 rounded-md border flex items-center justify-between text-xs ${
              durationInfo.isFullDay
                ? 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 text-blue-800 dark:text-blue-300'
                : durationInfo.isHalfDay
                ? 'bg-sky-50/80 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900/60 text-sky-800 dark:text-sky-300'
                : 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
            }`}>
              <div className="font-semibold">
                Duration: {durationInfo.hours}h {durationInfo.remMinutes}m
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                durationInfo.isFullDay
                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200'
                  : durationInfo.isHalfDay
                  ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-200'
                  : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200'
              }`}>
                {durationInfo.isFullDay
                  ? 'Full Day (8h+)'
                  : durationInfo.isHalfDay
                  ? 'Half Day (4h - 8h)'
                  : 'Short Hours (< 4h Absent)'}
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Evaluation
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('PRESENT')}
                className={`py-2 px-2 text-center text-xs font-semibold rounded-md border transition-colors ${
                  status === 'PRESENT'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Full Day
              </button>
              <button
                type="button"
                onClick={() => setStatus('HALF_DAY')}
                className={`py-2 px-2 text-center text-xs font-semibold rounded-md border transition-colors ${
                  status === 'HALF_DAY'
                    ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Half Day
              </button>
              <button
                type="button"
                onClick={() => setStatus('OPEN')}
                className={`py-2 px-2 text-center text-xs font-semibold rounded-md border transition-colors ${
                  status === 'OPEN'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                In Progress
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Note / Reason
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. On-site client visit, manual override"
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Punch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
