import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { Button, Input, Modal, SelectField } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { leaveApi } from '../api/leave.api';
import type { LeaveType } from '../types/leave-balance.types';

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  defaultAllocation: '0',
  carryForwardAllowed: true,
  maxCarryForward: '0',
};

export function LeaveTypesManager() {
  const toast = useToast();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setTypes(await leaveApi.getLeaveTypes());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load leave types.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (t: LeaveType) => {
    setEditing(t);
    setForm({
      code: t.code,
      name: t.name,
      description: t.description || '',
      defaultAllocation: String(t.defaultAllocation ?? 0),
      carryForwardAllowed: t.carryForwardAllowed,
      maxCarryForward: String(t.maxCarryForward ?? 0),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        defaultAllocation: Number(form.defaultAllocation) || 0,
        carryForwardAllowed: form.carryForwardAllowed,
        maxCarryForward: Number(form.maxCarryForward) || 0,
      };
      if (editing) {
        await leaveApi.updateLeaveType(editing._id, payload);
        toast.success(`"${payload.name}" updated.`);
      } else {
        await leaveApi.createLeaveType(payload);
        toast.success(`"${payload.name}" created.`);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save leave type.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (t: LeaveType) => {
    try {
      await leaveApi.toggleLeaveTypeStatus(t._id);
      toast.success(`"${t.name}" marked as ${t.status === 'ACTIVE' ? 'inactive' : 'active'}.`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update status.');
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
          <Plus className="h-3.5 w-3.5" />
          Add Leave Type
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 dark:bg-slate-900">
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 text-right font-semibold">Default Days</th>
              <th className="px-3 py-2 text-center font-semibold">Carry Fwd</th>
              <th className="px-3 py-2 text-right font-semibold">Max Carry</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-mono font-bold">{t.code}</td>
                <td className="px-3 py-2 font-semibold">{t.name}</td>
                <td className="px-3 py-2 text-right">{t.defaultAllocation}</td>
                <td className="px-3 py-2 text-center">{t.carryForwardAllowed ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-right">{t.carryForwardAllowed ? t.maxCarryForward : '—'}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEdit(t)}
                    className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title={t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    onClick={() => handleToggle(t)}
                    className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Leave Type' : 'Add Leave Type'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. CL" className="font-mono uppercase" />
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Casual Leave" />
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="When this leave applies" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Default Days / Year" type="number" value={form.defaultAllocation} onChange={(e) => setForm({ ...form, defaultAllocation: e.target.value })} />
            <Input label="Max Carry Forward" type="number" value={form.maxCarryForward} onChange={(e) => setForm({ ...form, maxCarryForward: e.target.value })} disabled={!form.carryForwardAllowed} />
          </div>
          <SelectField
            label="Carry Forward Allowed"
            value={form.carryForwardAllowed ? 'yes' : 'no'}
            onChange={(e) => setForm({ ...form, carryForwardAllowed: e.target.value === 'yes' })}
            options={[
              { value: 'yes', label: 'Yes — leftovers carry to next year (capped)' },
              { value: 'no', label: 'No — balance lapses at year end' },
            ]}
          />
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
    </div>
  );
}
