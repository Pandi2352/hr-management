import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { leaveApi } from '../api/leave.api';
import type { LeaveType } from '../types/leave-balance.types';

/**
 * One place for company-wide leave balances: edit each type's yearly default
 * once, then push it to every active employee for the selected year.
 */
export function DefaultLeavePolicyCard({
  leaveTypes,
  year,
  onApplied,
}: {
  leaveTypes: LeaveType[];
  year: number;
  onApplied: () => void;
}) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const activeTypes = leaveTypes.filter((t) => t.status === 'ACTIVE');
  const dirtyIds = Object.keys(drafts);

  const valueOf = (t: LeaveType) => drafts[t._id] ?? String(t.defaultAllocation ?? 0);

  const handleSaveDefaults = async () => {
    if (dirtyIds.length === 0) return;
    for (const id of dirtyIds) {
      const n = Number(drafts[id]);
      if (Number.isNaN(n) || n < 0) {
        toast.error('Default days must be zero or more.');
        return;
      }
    }
    setIsSaving(true);
    try {
      await Promise.all(
        dirtyIds.map((id) =>
          leaveApi.updateLeaveType(id, { defaultAllocation: Number(drafts[id]) }),
        ),
      );
      setDrafts({});
      toast.success('Default leave policy saved.');
      onApplied();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save defaults.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const res = await leaveApi.applyDefaultsToAll(year, overwrite);
      toast.success(
        `${res.created} wallets created${res.updated ? `, ${res.updated} reset` : ''} — ${res.carriedTotal} days carried forward.`,
        `Applied to all for ${year}`,
      );
      setConfirmOpen(false);
      onApplied();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not apply defaults.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          <div>
            <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">
              Default Leave Policy — applies to all employees
            </h3>
            <p className="text-[11px] text-slate-400">
              Set yearly days once per leave type, then push to everyone for {year}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400" title="Also reset allocated days on existing wallets (carried/used preserved)">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700"
            />
            Overwrite existing
          </label>
          <Button size="sm" variant="outline" onClick={handleSaveDefaults} disabled={isSaving || dirtyIds.length === 0}>
            {isSaving ? 'Saving…' : `Save Defaults${dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ''}`}
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)}>
            Apply to All for {year}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {activeTypes.map((t) => (
          <div key={t._id} className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-100" title={`${t.name} (${t.code})`}>
              {t.name} <span className="font-mono font-medium text-slate-400">{t.code}</span>
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Input
                type="number"
                value={valueOf(t)}
                onChange={(e) => setDrafts((d) => ({ ...d, [t._id]: e.target.value }))}
                className="h-8 text-xs"
                aria-label={`Default days for ${t.name}`}
              />
              <span className="text-[10px] whitespace-nowrap text-slate-400">days/yr</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              {t.carryForwardAllowed ? `Carry up to ${t.maxCarryForward}` : 'No carry forward'}
            </p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Apply defaults to all employees for ${year}?`}
        description={
          overwrite
            ? 'Missing wallets are created and allocated days on existing wallets are reset to the defaults above. Carried and used days are always preserved.'
            : 'Missing wallets are created from the defaults above (plus capped carry-forward). Existing wallets are never overwritten.'
        }
        confirmLabel={isApplying ? 'Applying…' : `Apply to All`}
        variant="primary"
        onConfirm={handleApply}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
