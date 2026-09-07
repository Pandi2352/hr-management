import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Save,
  CheckSquare,
  Square,
  Info,
  Layers,
} from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { useToast } from '../../../components/ui/toast';
import { securityApi } from '../api/security.api';
import { PERMISSION_GROUPS, type Role } from '../types/security.types';

const CATEGORY_ACCENTS = [
  { from: 'from-blue-500', to: 'to-sky-500', ring: 'ring-blue-500/20', border: 'border-blue-400 dark:border-blue-400', tint: 'bg-blue-50/40 dark:bg-blue-950/20', chip: 'bg-blue-500 border-blue-500' },
  { from: 'from-violet-500', to: 'to-purple-500', ring: 'ring-violet-500/20', border: 'border-violet-400 dark:border-violet-400', tint: 'bg-violet-50/40 dark:bg-violet-950/20', chip: 'bg-violet-500 border-violet-500' },
  { from: 'from-amber-500', to: 'to-orange-500', ring: 'ring-amber-500/20', border: 'border-amber-400 dark:border-amber-400', tint: 'bg-amber-50/40 dark:bg-amber-950/20', chip: 'bg-amber-500 border-amber-500' },
  { from: 'from-emerald-500', to: 'to-teal-500', ring: 'ring-emerald-500/20', border: 'border-emerald-400 dark:border-emerald-400', tint: 'bg-emerald-50/40 dark:bg-emerald-950/20', chip: 'bg-emerald-500 border-emerald-500' },
];

export function RoleCreateEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [existingRole, setExistingRole] = useState<Role | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isNew && typeof id === 'string') {
      const roleId: string = id;
      async function loadRole() {
        try {
          setIsLoading(true);
          const data = await securityApi.getRoleById(roleId);
          setExistingRole(data);
          setFormData({
            name: data.name,
            code: data.code,
            description: data.description || '',
          });
          setSelectedPermissions(new Set(data.permissions || []));
        } catch {
          toast.error('Failed to load role details');
          navigate('/security/roles');
        } finally {
          setIsLoading(false);
        }
      }
      loadRole();
    }
  }, [id, isNew, navigate, toast]);

  const togglePermission = (key: string) => {
    if (existingRole?.isSystem && existingRole.code === 'super_admin') {
      toast.info('Super Administrator retains all privileges by system design.');
      return;
    }
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (keys: string[]) => {
    if (existingRole?.isSystem && existingRole.code === 'super_admin') return;
    const allSelected = keys.every((k) => selectedPermissions.has(k));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (existingRole?.isSystem && existingRole.code === 'super_admin') return;
    const allKeys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    const isEverythingSelected = allKeys.every((k) => selectedPermissions.has(k));
    if (isEverythingSelected) {
      setSelectedPermissions(new Set());
    } else {
      setSelectedPermissions(new Set(allKeys));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Role name is required';
    if (isNew && !formData.code.trim()) errors.code = 'Role code identifier is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      if (isNew) {
        await securityApi.createRole({
          name: formData.name.trim(),
          code: formData.code.trim().toLowerCase().replace(/\s+/g, '_'),
          description: formData.description.trim(),
          permissions: Array.from(selectedPermissions),
        });
        toast.success(`Role "${formData.name}" created successfully`);
      } else if (id) {
        await securityApi.updateRole(id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          permissions: Array.from(selectedPermissions),
        });
        toast.success(`Role "${formData.name}" updated successfully`);
      }
      navigate('/security/roles');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-64 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const allKeys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
  const isAllSelected = allKeys.length > 0 && allKeys.every((k) => selectedPermissions.has(k));

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={isNew ? 'Create Custom Role' : `Edit Role: ${formData.name}`}
        description="Specify access policies, operational boundaries, and resource privileges."
        leading={
          <button
            type="button"
            onClick={() => navigate('/security/roles')}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5"
            >
              {isAllSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {isAllSelected ? 'Deselect All' : 'Select All Permissions'}
            </Button>

            <Button
              onClick={handleSubmit}
              size="sm"
              isLoading={isSaving}
              className="flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Role Permissions
            </Button>
          </>
        }
      />

      {/* Role Metadata Form */}
      <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Input
            label="Role Name"
            required
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Payroll Auditor, Talent Acquisition Lead"
            error={fieldErrors.name}
          />

          <Input
            label="Code Slug Identifier"
            required
            disabled={!isNew}
            value={formData.code}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, code: e.target.value }));
              if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: '' }));
            }}
            placeholder="e.g. payroll_auditor"
            helperText={!isNew ? 'System role codes cannot be modified' : 'Auto-formatted as lower_snake_case'}
            error={fieldErrors.code}
          />

          <Input
            label="Descriptive Summary"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Brief statement of role scope..."
          />
        </div>

        {existingRole?.isSystem && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-300 text-xs">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              This is a built-in system role. You can customize its granular permission matrix, but its core code identifier cannot be altered.
            </span>
          </div>
        )}
      </div>

      {/* Granular Permission Matrix */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[11px] text-violet-600 dark:text-violet-400">
            Permission Matrix & Privilege Matrix
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {selectedPermissions.size} of {allKeys.length} Permissions Active
          </span>
        </div>

        <div className="space-y-4">
          {PERMISSION_GROUPS.map((group, gIdx) => {
            const groupKeys = group.permissions.map((p) => p.key);
            const isGroupAllSelected = groupKeys.every((k) => selectedPermissions.has(k));
            const selectedCount = groupKeys.filter((k) => selectedPermissions.has(k)).length;
            const accent = CATEGORY_ACCENTS[gIdx % CATEGORY_ACCENTS.length];

            return (
              <div
                key={gIdx}
                className={`rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden ring-1 ${accent.ring}`}
              >
                {/* Category Header Bar */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${accent.from} ${accent.to} text-white`}>
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {group.category}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCategory(groupKeys)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer transition-colors shrink-0"
                  >
                    <span>{isGroupAllSelected ? 'Deselect Group' : 'Select Group'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                      {selectedCount}/{groupKeys.length}
                    </span>
                  </button>
                </div>

                {/* Permissions Grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.permissions.map((perm) => {
                    const isGranted = selectedPermissions.has(perm.key);

                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`p-3 rounded-md border text-left cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isGranted
                            ? `${accent.border} ${accent.tint}`
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {perm.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {perm.description}
                          </p>
                          <code className="inline-block text-[10px] text-slate-400 font-mono">
                            {perm.key}
                          </code>
                        </div>

                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors mt-0.5 ${
                            isGranted
                              ? `${accent.chip} text-white`
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isGranted && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
