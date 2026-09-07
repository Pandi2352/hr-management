import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/data-table/DataTable';
import type { Column } from '../../../components/data-table/DataTable';
import { Button, Input, SelectField, StatusBadge, Tooltip } from '../../../components/ui';
import { Drawer } from '../../../components/overlay/Drawer';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { CostCenter, Department } from '../types/organization.types';
import { Landmark, Building2, Edit2, Power } from 'lucide-react';

export function CostCentersPage() {
  const toast = useToast();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    departmentId: '',
    description: '',
  });

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetCC, setTargetCC] = useState<CostCenter | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ccList, deptList] = await Promise.all([
        organizationApi.getCostCenters(),
        organizationApi.getDepartments(),
      ]);
      setCostCenters(ccList || []);
      setDepartments(deptList || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load cost centers');
    } finally {
      setIsLoading(false);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setEditingCC(null);
    setFormData({ code: '', name: '', departmentId: '', description: '' });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (cc: CostCenter) => {
    setEditingCC(cc);
    setFormData({
      code: cc.code,
      name: cc.name,
      departmentId: cc.departmentId || '',
      description: cc.description || '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Cost center code is required';
    if (!formData.name.trim()) errors.name = 'Cost center name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    try {
      setIsSubmitting(true);
      const payload: Partial<CostCenter> = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        departmentId: formData.departmentId || null,
        description: formData.description.trim(),
      };

      if (editingCC) {
        await organizationApi.updateCostCenter(editingCC._id, payload);
        toast.success('Cost center updated successfully');
      } else {
        await organizationApi.createCostCenter(payload);
        toast.success('Cost center created successfully');
      }
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!targetCC) return;
    try {
      setIsToggling(true);
      const updated = await organizationApi.toggleCostCenterStatus(targetCC._id);
      toast.success(`Cost center marked as ${updated.status.toLowerCase()}`);
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  const columns: Column<CostCenter>[] = [
    {
      header: 'Cost Center Code',
      accessorKey: 'code',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Landmark className="h-4 w-4" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
            {row.code}
          </span>
        </div>
      ),
    },
    {
      header: 'Cost Center Name',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</span>
          {row.description && (
            <p className="text-xs text-slate-400 line-clamp-1">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Allocated Department',
      cell: (row) => {
        const dept = departments.find((d) => d._id === row.departmentId);
        return dept ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>{dept.name} ({dept.code})</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Unallocated</span>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Tooltip content="Edit Cost Center" placement="top">
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Edit Cost Center"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          <Tooltip content={row.status === 'ACTIVE' ? 'Deactivate Cost Center' : 'Activate Cost Center'} placement="top">
            <button
              type="button"
              onClick={() => {
                setTargetCC(row);
                setDialogOpen(true);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
                row.status === 'ACTIVE'
                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
              aria-label={row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cost Centers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Budget tracking codes and financial accounting allocations for organizational departments.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenAdd}>
          + Add Cost Center
        </Button>
      </div>

      <DataTable
        data={costCenters}
        columns={columns}
        searchPlaceholder="Search by code or name..."
        searchKey={(c) => `${c.code} ${c.name}`}
        isLoading={isLoading}
        onAddClick={handleOpenAdd}
        addLabel="Add Cost Center"
        emptyTitle="No cost centers configured"
        emptyDescription="Create cost centers to enable payroll accounting and expense reporting."
      />

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingCC ? 'Edit Cost Center' : 'Create Cost Center'}
        description="Assign budgetary codes and primary allocated department"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Cost Center Code"
            required
            value={formData.code}
            onChange={(e) => {
              setFormData({ ...formData, code: e.target.value });
              if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: '' }));
            }}
            placeholder="e.g. CC-1001, FIN-EXP-01"
            error={formErrors.code}
          />

          <Input
            label="Cost Center Name"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Core Engineering, Sales EMEA"
            error={formErrors.name}
          />

          <SelectField
            label="Allocated Department"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            placeholder="None (General Overhead)"
            options={departments.map((d) => ({
              value: d._id,
              label: `${d.name} (${d.code})`,
            }))}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Financial ledger allocation details..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#524b6e]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              {editingCC ? 'Update Cost Center' : 'Create Cost Center'}
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        isOpen={dialogOpen}
        title={targetCC?.status === 'ACTIVE' ? 'Deactivate Cost Center' : 'Activate Cost Center'}
        description={`Are you sure you want to mark "${targetCC?.code} - ${targetCC?.name}" as ${targetCC?.status === 'ACTIVE' ? 'inactive' : 'active'}?`}
        variant={targetCC?.status === 'ACTIVE' ? 'danger' : 'primary'}
        confirmLabel={targetCC?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        isLoading={isToggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
