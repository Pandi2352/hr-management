import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/data-table/DataTable';
import type { Column } from '../../../components/data-table/DataTable';
import { Button, Input, SelectField, StatusBadge, Tooltip } from '../../../components/ui';
import { Drawer } from '../../../components/overlay/Drawer';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { Department, CostCenter } from '../types/organization.types';
import { Network, Users, Building, Edit2, Power } from 'lucide-react';

export function DepartmentsPage() {
  const toast = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parentId: '',
    costCenterId: '',
    description: '',
  });

  // Deactivate dialog state
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [targetDept, setTargetDept] = useState<Department | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [deptList, ccList] = await Promise.all([
        organizationApi.getDepartments(),
        organizationApi.getCostCenters(),
      ]);
      setDepartments(deptList || []);
      setCostCenters(ccList || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', parentId: '', costCenterId: '', description: '' });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      parentId: dept.parentId || '',
      costCenterId: dept.costCenterId || '',
      description: dept.description || '',
    });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Department name is required';
    if (!formData.code.trim()) errors.code = 'Department code is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    try {
      setIsSubmitting(true);
      const payload: Partial<Department> = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        parentId: formData.parentId || null,
        costCenterId: formData.costCenterId || null,
        description: formData.description.trim(),
      };

      if (editingDept) {
        await organizationApi.updateDepartment(editingDept._id, payload);
        toast.success('Department updated successfully');
      } else {
        await organizationApi.createDepartment(payload);
        toast.success('Department created successfully');
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
    if (!targetDept) return;
    try {
      setIsDeactivating(true);
      const updated = await organizationApi.toggleDepartmentStatus(targetDept._id);
      toast.success(`Department "${updated.name}" is now ${updated.status.toLowerCase()}`);
      setDeactivateDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns: Column<Department>[] = [
    {
      header: 'Department Name',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 text-[#524b6e] dark:bg-indigo-950/40 dark:text-indigo-400">
            <Building className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{row.name}</span>
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
      header: 'Members',
      accessorKey: 'memberCount',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          <span>{row.memberCount || 0}</span>
        </div>
      ),
    },
    {
      header: 'Cost Center',
      cell: (row) => {
        const cc = costCenters.find((c) => c._id === row.costCenterId);
        return <span className="text-xs text-slate-600 dark:text-slate-400">{cc ? `${cc.code} - ${cc.name}` : '—'}</span>;
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
          <Tooltip content="Edit Department" placement="top">
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Edit Department"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          <Tooltip content={row.status === 'ACTIVE' ? 'Deactivate Department' : 'Activate Department'} placement="top">
            <button
              type="button"
              onClick={() => {
                setTargetDept(row);
                setDeactivateDialogOpen(true);
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
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Departments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your organization's divisional structure, member counts, and cost center allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/organization/departments/tree">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Network className="h-4 w-4" />
              Hierarchy Tree
            </Button>
          </Link>
          <Button size="sm" onClick={handleOpenAdd}>
            + Add Department
          </Button>
        </div>
      </div>

      {/* Main Table & Responsive Cards */}
      <DataTable
        data={departments}
        columns={columns}
        searchPlaceholder="Search by name or code..."
        searchKey={(d) => `${d.name} ${d.code}`}
        isLoading={isLoading}
        onAddClick={handleOpenAdd}
        addLabel="Add Department"
        emptyTitle="No departments configured"
        emptyDescription="Create departments to assign employees and designate cost center responsibility."
        renderCard={(dept) => (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:bg-slate-950 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#524b6e] bg-indigo-50 px-2 py-0.5 rounded dark:bg-slate-800 dark:text-indigo-400">
                  {dept.code}
                </span>
                <StatusBadge status={dept.status} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                {dept.name}
              </h3>
              {dept.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {dept.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>{dept.memberCount || 0} Members</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80">
              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(dept)}>
                Edit
              </Button>
              <Button
                variant={dept.status === 'ACTIVE' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => {
                  setTargetDept(dept);
                  setDeactivateDialogOpen(true);
                }}
              >
                {dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
      />

      {/* Add / Edit Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingDept ? 'Edit Department' : 'Create Department'}
        description="Configure department metadata, hierarchical parent, and cost center"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department Name"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Engineering, Human Resources"
            error={formErrors.name}
          />

          <Input
            label="Department Code"
            required
            value={formData.code}
            onChange={(e) => {
              setFormData({ ...formData, code: e.target.value });
              if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: '' }));
            }}
            placeholder="e.g. ENG-01, HR-01"
            error={formErrors.code}
          />

          <SelectField
            label="Parent Department"
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            placeholder="No Parent (Root Department)"
            options={departments
              .filter((d) => !editingDept || d._id !== editingDept._id)
              .map((d) => ({
                value: d._id,
                label: `${d.name} (${d.code})`,
              }))}
          />

          <SelectField
            label="Allocated Cost Center"
            value={formData.costCenterId}
            onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
            placeholder="None Assigned"
            options={costCenters.map((cc) => ({
              value: cc._id,
              label: `${cc.code} - ${cc.name}`,
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
              placeholder="Brief description of responsibilities..."
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
              {editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Confirmation Dialog for Status Changes */}
      <ConfirmDialog
        isOpen={deactivateDialogOpen}
        title={targetDept?.status === 'ACTIVE' ? 'Deactivate Department' : 'Activate Department'}
        description={
          targetDept?.status === 'ACTIVE'
            ? `Are you sure you want to deactivate "${targetDept?.name}"? Make sure any active members or sub-departments are reassigned.`
            : `Are you sure you want to reactivate "${targetDept?.name}"?`
        }
        variant={targetDept?.status === 'ACTIVE' ? 'danger' : 'primary'}
        confirmLabel={targetDept?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        isLoading={isDeactivating}
        onConfirm={handleToggleStatus}
        onCancel={() => setDeactivateDialogOpen(false)}
      />
    </div>
  );
}
