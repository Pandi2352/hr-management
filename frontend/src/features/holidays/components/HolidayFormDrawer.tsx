import { useEffect, useState } from 'react';
import { Button, Input, SelectField } from '../../../components/ui';
import { Drawer } from '../../../components/overlay/Drawer';
import { useToast } from '../../../components/ui/toast';
import { holidaysApi } from '../api/holidays.api';
import type { Holiday } from '../types/holidays.types';

export function HolidayFormDrawer({
  isOpen,
  editing,
  defaultYear,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  editing: Holiday | null;
  defaultYear: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'FIXED' | 'RESTRICTED'>('FIXED');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setName(editing.name);
      setDate(editing.date);
      setType(editing.type);
      setDescription(editing.description || '');
    } else {
      setName('');
      setDate(`${defaultYear}-01-01`);
      setType('FIXED');
      setDescription('');
    }
    setErrors({});
  }, [isOpen, editing, defaultYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Holiday name is required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Pick a valid date';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setIsSaving(true);
    try {
      const payload = { name: name.trim(), date, type, description: description.trim() };
      if (editing) {
        await holidaysApi.updateHoliday(editing._id, payload);
        toast.success(`"${payload.name}" updated.`);
      } else {
        await holidaysApi.createHoliday(payload);
        toast.success(`"${payload.name}" added to the calendar.`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save holiday.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit Holiday' : 'Add Holiday'}
      description="Fixed holidays apply to everyone; restricted holidays are picked by employees within their yearly limit."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Holiday Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Diwali"
          error={errors.name}
        />
        <Input
          label="Date"
          required
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
        <SelectField
          label="Holiday Type"
          value={type}
          onChange={(e) => setType(e.target.value as 'FIXED' | 'RESTRICTED')}
          options={[
            { value: 'FIXED', label: 'Fixed holiday (applies to everyone)' },
            { value: 'RESTRICTED', label: 'Restricted holiday (employee opt-in)' },
          ]}
        />
        <Input
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Regional observance"
        />
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : editing ? 'Update Holiday' : 'Add Holiday'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
