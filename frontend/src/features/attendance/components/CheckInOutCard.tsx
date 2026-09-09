import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { attendanceApi } from '../api/attendance.api';
import { formatRecordDate, formatWorkMinutes, type AttendanceRecord } from '../types/attendance.types';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Punch card with selectable date + time (defaults to today / now). */
export function CheckInOutCard({
  record,
  onChanged,
}: {
  record: AttendanceRecord | null;
  onChanged: (record: AttendanceRecord) => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState(record?.date || todayStr());
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);

  const punch = async (kind: 'in' | 'out') => {
    setIsWorking(true);
    try {
      const payload = {
        ...(date !== todayStr() ? { date } : {}),
        ...(time ? { time } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const updated =
        kind === 'in' ? await attendanceApi.checkIn(payload) : await attendanceApi.checkOut(payload);
      setTime('');
      setNote('');
      setDate(updated.date);
      onChanged(updated);
      toast.success(
        kind === 'in' ? `Checked in at ${updated.checkIn}.` : `Checked out — ${formatWorkMinutes(updated.workMinutes)} today.`,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Could not check ${kind}.`);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">Check In / Out</h3>
          <p className="text-[11px] text-slate-400">
            {record ? `${formatRecordDate(record.date)} · in ${record.checkIn || '—'}${record.checkOut ? ` · out ${record.checkOut}` : ''}` : 'Not punched yet today'}
          </p>
        </div>
        {record && checkedOut && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {formatWorkMinutes(record.workMinutes)}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[150px_130px_1fr]">
        <Input label="Date" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        <Input
          label="Time (24h)"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          helperText="Empty = now"
        />
        <Input label="Note (Optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Forgot morning punch" />
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => punch('in')} disabled={isWorking || checkedIn} className="flex flex-1 items-center justify-center gap-1.5">
          <LogIn className="h-3.5 w-3.5" />
          {checkedIn ? `In ${record?.checkIn}` : 'Check In'}
        </Button>
        <Button
          size="sm"
          variant={checkedOut ? 'outline' : 'primary'}
          onClick={() => punch('out')}
          disabled={isWorking || !checkedIn || checkedOut}
          className="flex flex-1 items-center justify-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          {checkedOut ? `Out ${record?.checkOut}` : 'Check Out'}
        </Button>
      </div>
    </div>
  );
}
