import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/data-table/DataTable';
import type { Column } from '../../../components/data-table/DataTable';
import { Button, Input, StatusBadge, Tooltip } from '../../../components/ui';
import { Drawer } from '../../../components/overlay/Drawer';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { Designation } from '../types/organization.types';
import { Award, Users, Edit2, Power } from 'lucide-react';

export function DesignationsPage() {
  const toast = useToast();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    grade: 5,
    description: '',
  });

  // Deactivate dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetDesig, setTargetDesig] = useState<Designation | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    try {
      setIsLoading(true);
      const data = await organizationApi.getDesignations();
      setDesignations(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load designations');
    } finally {
      setIsLoading(false);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setEditingDesig(null);
    setFormData({ title: '', code: '', grade: 5, description: '' });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (d: Designation) => {
    setEditingDesig(d);
    setFormData({
      title: d.title,
      code: d.code,
      grade: d.grade || 5,
      description: d.description || '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Designation title is required';
    if (!formData.code.trim()) errors.code = 'Designation code is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    try {
      setIsSubmitting(true);
      const payload: Partial<Designation> = {
        title: formData.title.trim(),
        code: formData.code.trim().toUpperCase(),
        grade: Number(formData.grade),
        description: formData.description.trim(),
      };

      if (editingDesig) {
        await organizationApi.updateDesignation(editingDesig._id, payload);
        toast.success('Designation updated successfully');
      } else {
        await organizationApi.createDesignation(payload);
        toast.success('Designation created successfully');
      }
      setDrawerOpen(false);
      loadDesignations();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!targetDesig) return;
    try {
      setIsToggling(true);
      const updated = await organizationApi.toggleDesignationStatus(targetDesig._id);
      toast.success(`Designation marked as ${updated.status.toLowerCase()}`);
      setDialogOpen(false);
      loadDesignations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsToggling(false);
    }
  };

  const columns: Column<Designation>[] = [
    {
      header: 'Designation Title',
      accessorKey: 'title',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-[#524b6e] dark:bg-purple-950/40 dark:text-purple-300">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{row.title}</span>
            {row.description && (
              <p className="text-xs text-slate-400 line-clamp-1">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Code',
      accessorKey: 'code',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-medium">{row.code}</span>,
    },
    {
      header: 'Grade / Seniority',
      accessorKey: 'grade',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-[#524b6e] dark:text-indigo-400">
            Grade {row.grade}
          </span>
          <span className="text-[11px] text-slate-400">
            ({row.grade <= 3 ? 'Junior' : row.grade <= 7 ? 'Mid-Level' : 'Senior Executive'})
          </span>
        </div>
      ),
    },
    {
      header: 'Assigned Employees',
      accessorKey: 'assignedEmployeeCount',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span>{row.assignedEmployeeCount || 0} employees</span>
        </div>
      ),
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
          <Tooltip content="Edit Designation" placement="top">
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Edit Designation"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          <Tooltip content={row.status === 'ACTIVE' ? 'Deactivate Designation' : 'Activate Designation'} placement="top">
            <button
              type="button"
              onClick={() => {
                setTargetDesig(row);
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
            Designations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Define corporate job titles, compensation grades (1 to 10), and career progression tracks.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenAdd}>
          + Add Designation
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        data={designations}
        columns={columns}
        searchPlaceholder="Search by title or code..."
        searchKey={(d) => `${d.title} ${d.code}`}
        isLoading={isLoading}
        onAddClick={handleOpenAdd}
        addLabel="Add Designation"
        emptyTitle="No designations configured"
        emptyDescription="Create designations to establish seniority levels and role job titles."
      />

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingDesig ? 'Edit Designation' : 'Create Designation'}
        description="Configure role title, code, and seniority grade level (1-10)"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Designation Title"
            required
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder="e.g. Senior Software Engineer, VP of Sales"
            error={formErrors.title}
          />

          <Input
            label="Designation Code"
            required
            value={formData.code}
            onChange={(e) => {
              setFormData({ ...formData, code: e.target.value });
              if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: '' }));
            }}
            placeholder="e.g. SSE-01, VPS-01"
            error={formErrors.code}
          />

          {/* Grade 1 - 10 Slider */}
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Seniority Grade: <span className="text-[#524b6e] font-bold text-sm">Grade {formData.grade}</span>
              </label>
              <span className="text-xs font-medium text-slate-500">
                {formData.grade <= 3 ? 'Junior Level' : formData.grade <= 7 ? 'Mid-to-Senior' : 'Leadership / C-Suite'}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
              className="w-full accent-[#524b6e] cursor-pointer"
            />

            <div className="flex justify-between text-[11px] font-medium text-slate-400">
              <span>Grade 1 (Entry)</span>
              <span>Grade 5</span>
              <span>Grade 10 (Executive)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Scope of work and role expectations..."
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
              {editingDesig ? 'Update Designation' : 'Create Designation'}
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        isOpen={dialogOpen}
        title={targetDesig?.status === 'ACTIVE' ? 'Deactivate Designation' : 'Activate Designation'}
        description={`Are you sure you want to mark "${targetDesig?.title}" as ${targetDesig?.status === 'ACTIVE' ? 'inactive' : 'active'}?`}
        variant={targetDesig?.status === 'ACTIVE' ? 'danger' : 'primary'}
        confirmLabel={targetDesig?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        isLoading={isToggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}
