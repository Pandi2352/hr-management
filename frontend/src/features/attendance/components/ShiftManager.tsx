import { useCallback, useEffect, useState } from 'react';
import { Clock3, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { Button, Input, Modal } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { attendanceApi } from '../api/attendance.api';
import type { Shift } from '../types/shift.types';

const EMPTY = { name: '', code: '', startTime: '09:00', endTime: '18:00', graceMinutes: '15', breakMinutes: '60' };

export function ShiftManager() {
  const toast = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setShifts(await attendanceApi.getShifts());
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load shifts.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (s: Shift) => {
    setEditing(s);
    setForm({
      name: s.name,
      code: s.code,
      startTime: s.startTime,
      endTime: s.endTime,
      graceMinutes: String(s.graceMinutes ?? 15),
      breakMinutes: String(s.breakMinutes ?? 60),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        startTime: form.startTime,
        endTime: form.endTime,
        graceMinutes: Number(form.graceMinutes) || 0,
        breakMinutes: Number(form.breakMinutes) || 0,
      };
      if (editing) {
        await attendanceApi.updateShift(editing._id, payload);
        toast.success(`Shift "${payload.name}" updated.`);
      } else {
        await attendanceApi.createShift(payload);
        toast.success(`Shift "${payload.name}" created.`);
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save shift.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (s: Shift) => {
    try {
      await attendanceApi.toggleShiftStatus(s._id);
      toast.success(`Shift marked as ${s.status === 'ACTIVE' ? 'inactive' : 'active'}.`);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not update status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await attendanceApi.deleteShift(deleteTarget._id);
      toast.success(`Shift "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not delete shift.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" variant="violet" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd} className="flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Shift
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shifts.map((s) => (
          <div key={s._id} className="rounded-md border border-hairline bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-bold">{s.name}</p>
                  <p className="font-mono text-[11px] text-ink-3">{s.code}</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                {s.status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold tabular-nums">
              <span>{s.startTime}</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span>{s.endTime}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-ink-3">
              Grace {s.graceMinutes}m · {s.assignedCount ?? 0} assigned
            </p>
            <div className="mt-3 flex justify-end gap-1 border-t border-hairline pt-2">
              <button type="button" title="Edit" onClick={() => openEdit(s)} className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" title={s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(s)} className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                <Power className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Delete" onClick={() => setDeleteTarget(s)} className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Shift' : 'Add Shift'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shift Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. General Day Shift" />
            <Input label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. GENERAL" className="font-mono uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time (24h)" required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Input label="End Time (24h)" required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} helperText="Earlier than start = overnight" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Grace Minutes" type="number" value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: e.target.value })} helperText="Late/early tolerance" />
            <Input label="Break Minutes" type="number" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Only possible when no employee is assigned to it."
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete Shift'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
