import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  Users,
  ArrowRight,
  Sliders,
  Trash2,
  Lock,
  Filter,
  RotateCcw,
  X,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Button, Tooltip, Spinner, SearchInput, SelectField } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { securityApi } from '../api/security.api';
import type { Role } from '../types/security.types';

const ROLE_ACCENTS: Record<string, { from: string; to: string; ring: string }> = {
  super_admin: { from: 'from-indigo-500', to: 'to-violet-600', ring: 'ring-indigo-500/20' },
  hr_admin: { from: 'from-blue-500', to: 'to-sky-500', ring: 'ring-blue-500/20' },
  manager: { from: 'from-violet-500', to: 'to-purple-500', ring: 'ring-violet-500/20' },
  employee: { from: 'from-slate-400', to: 'to-slate-500', ring: 'ring-slate-400/20' },
};
const CUSTOM_ROLE_ACCENT = { from: 'from-emerald-500', to: 'to-teal-500', ring: 'ring-emerald-500/20' };

function getRoleAccent(code: string) {
  return ROLE_ACCENTS[code] || CUSTOM_ROLE_ACCENT;
}

export function RolesPermissionsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const data = await securityApi.getRoles();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roles');
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleDeleteRoleConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await securityApi.deleteRole(deleteTarget._id);
      toast.success(res.message);
      setDeleteTarget(null);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  const systemCount = roles.filter((r) => r.isSystem).length;
  const customCount = roles.filter((r) => !r.isSystem).length;

  const filteredRoles = roles.filter((role) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      role.name.toLowerCase().includes(q) ||
      role.code.toLowerCase().includes(q) ||
      (role.description && role.description.toLowerCase().includes(q));

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'SYSTEM' && role.isSystem) ||
      (typeFilter === 'CUSTOM' && !role.isSystem);

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Roles & Permissions Hub"
        description="Configure system roles, access boundaries, and granular permission matrices."
        actions={
          <>
            <Link to="/security/users">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 shadow-xs">
                <Users className="h-3.5 w-3.5" />
                Users Roster
              </Button>
            </Link>
            <Link to="/security/roles/new">
              <Button size="sm" className="flex items-center gap-1.5 shadow-xs">
                <Plus className="h-3.5 w-3.5" />
                Create Custom Role
              </Button>
            </Link>
          </>
        }
      />

      {/* Rich Colorful Filter Panel Card */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5 transition-all">
        {/* Top: Scope Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-violet-500" />
              Role Type:
            </span>
            {[
              { id: 'ALL', label: `All Roles (${roles.length})`, icon: Shield },
              { id: 'SYSTEM', label: `System Default (${systemCount})`, icon: Lock },
              { id: 'CUSTOM', label: `Custom Roles (${customCount})`, icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border select-none ${
                    isActive
                      ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 border border-violet-100 dark:border-violet-900/40 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span>{filteredRoles.length} of {roles.length} roles shown</span>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchInput
            label="Search Role"
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search by role title, code or description..."
          />

          <SelectField
            label="Role Classification"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            options={[
              { value: 'ALL', label: 'All Roles (System & Custom)' },
              { value: 'SYSTEM', label: 'System Predefined (Core Guards)' },
              { value: 'CUSTOM', label: 'Custom Organization Roles' },
            ]}
          />
        </div>

        {/* Active Filter Badges */}
        {(!!searchQuery || typeFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300">
                Search: "{searchQuery}"
                <X className="h-3 w-3 cursor-pointer hover:text-violet-900" onClick={() => setSearchQuery('')} />
              </span>
            )}

            {typeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                Type: {typeFilter === 'SYSTEM' ? 'System Roles' : 'Custom Roles'}
                <X className="h-3 w-3 cursor-pointer hover:text-indigo-900" onClick={() => setTypeFilter('ALL')} />
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
              }}
              className="inline-flex items-center gap-1 ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="rounded-md border border-slate-200 bg-white p-16 dark:border-slate-800 dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" variant="violet" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
            Loading system roles & permissions...
          </p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white p-12 dark:border-slate-800 dark:bg-slate-950 flex flex-col items-center justify-center text-center">
          <Shield className="h-8 w-8 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No roles match your filter</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">Try clearing your search query or selecting a different role classification.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setSearchQuery(''); setTypeFilter('ALL'); }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoles.map((role) => {
            const accent = getRoleAccent(role.code);
            return (
            <div
              key={role._id}
              className={`group rounded-md border border-slate-200 bg-white p-5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 transition-all flex flex-col justify-between ring-1 ${accent.ring}`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br ${accent.from} ${accent.to} text-white`}>
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {role.name}
                      </h2>
                      <span className="text-[11px] font-mono text-slate-400">
                        {role.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {role.isSystem ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        <Lock className="h-2.5 w-2.5" />
                        System
                      </span>
                    ) : (
                      <Tooltip content="Delete Custom Role" placement="top">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(role)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-8">
                  {role.description || 'No descriptive summary provided.'}
                </p>

                {/* Badges / Stats */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>{role.userCount || 0} Assigned Users</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sliders className="h-3.5 w-3.5 text-slate-400" />
                    <span>{role.permissions?.length || 0} Permissions</span>
                  </span>
                </div>

                {/* Permissions Preview Chip Cloud */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {role.permissions?.slice(0, 4).map((p, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-mono dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                    >
                      {p}
                    </span>
                  ))}
                  {role.permissions?.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 text-[10px] font-mono dark:bg-slate-900">
                      +{role.permissions.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/security/roles/${role._id}`)}
                  className="w-full flex items-center justify-center gap-2 group-hover:border-[#524b6e] group-hover:text-[#524b6e] dark:group-hover:border-indigo-400 dark:group-hover:text-indigo-400 transition-colors"
                >
                  <span>Configure Permission Matrix</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete Role "${deleteTarget?.name}"?`}
        description="Are you sure you want to delete this custom role? This action cannot be undone. Make sure no users are currently assigned to this role."
        confirmLabel="Delete Role"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteRoleConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
