import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { holidaysApi } from '../api/holidays.api';
import type { HolidayCalendar } from '../types/holidays.types';

export function CalendarSettingsCard({
  calendar,
  onUpdated,
}: {
  calendar: HolidayCalendar;
  onUpdated: (next: HolidayCalendar) => void;
}) {
  const toast = useToast();
  const [limit, setLimit] = useState(String(calendar.restrictedLimit ?? 2));
  const [note, setNote] = useState(calendar.note || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) {
      toast.error('Restricted limit must be a whole number between 0 and 10.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await holidaysApi.updateCalendar(calendar.year, {
        restrictedLimit: parsed,
        note: note.trim(),
      });
      onUpdated(updated);
      toast.success(`Holiday calendar ${calendar.year} settings saved.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save calendar settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-teal-700 dark:text-teal-400" />
        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">
          Calendar Settings — {calendar.year}
        </h3>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
        <Input
          label="Restricted Limit"
          type="number"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          helperText="Picks allowed per employee"
        />
        <Input
          label="Calendar Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Holiday Calendar 2026"
          helperText="Shown under the employee list"
        />
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-9">
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
