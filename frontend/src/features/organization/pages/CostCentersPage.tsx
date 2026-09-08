import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Building2,
  Edit2,
  Power,
  Filter,
  X,
  LayoutGrid,
  List,
  CheckCircle2,
  Receipt,
  Layers,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import { DataTable, type Column } from '../../../components/data-table/DataTable';
import { Button, Input, SelectField, StatusBadge, Tooltip, SearchInput } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { Drawer } from '../../../components/overlay/Drawer';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { CostCenter, Department } from '../types/organization.types';
import { cn } from '../../../utils/cn';

type ViewMode = 'cards' | 'table';
type ScopeFilter = 'ALL' | 'ACTIVE' | 'ALLOCATED' | 'UNALLOCATED' | 'INACTIVE';

export function CostCentersPage() {
  const toast = useToast();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'department'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const getDept = (deptId?: string | null) => {
    if (!deptId) return null;
    return departments.find((d) => d._id === deptId) || null;
  };

  // Metrics computation for top 5 color cards
  const metrics = useMemo(() => {
    const total = costCenters.length;
    const active = costCenters.filter((c) => c.status === 'ACTIVE').length;
    const allocated = costCenters.filter((c) => !!c.departmentId).length;
    const unallocated = total - allocated;
    const coveredDepts = new Set(costCenters.map((c) => c.departmentId).filter(Boolean)).size;
    return { total, active, allocated, unallocated, coveredDepts };
  }, [costCenters]);

  const metricCards = [
    {
      label: 'Total Cost Centers',
      value: metrics.total,
      icon: Landmark,
      from: 'from-amber-500',
      to: 'to-orange-600',
      ring: 'ring-amber-500/20',
    },
    {
      label: 'Active Centers',
      value: metrics.active,
      icon: CheckCircle2,
      from: 'from-emerald-500',
      to: 'to-teal-500',
      ring: 'ring-emerald-500/20',
    },
    {
      label: 'Allocated to Depts',
      value: metrics.allocated,
      icon: Building2,
      from: 'from-indigo-500',
      to: 'to-violet-600',
      ring: 'ring-indigo-500/20',
    },
    {
      label: 'Unallocated Centers',
      value: metrics.unallocated,
      icon: Receipt,
      from: 'from-rose-500',
      to: 'to-pink-600',
      ring: 'ring-rose-500/20',
    },
    {
      label: 'Covered Divisions',
      value: metrics.coveredDepts,
      icon: Layers,
      from: 'from-sky-500',
      to: 'to-blue-600',
      ring: 'ring-sky-500/20',
    },
  ];

  // Filtered & Sorted Cost Centers
  const filteredCostCenters = useMemo(() => {
    return costCenters
      .filter((cc) => {
        // Scope filter
        if (scopeFilter === 'ACTIVE' && cc.status !== 'ACTIVE') return false;
        if (scopeFilter === 'INACTIVE' && cc.status !== 'INACTIVE') return false;
        if (scopeFilter === 'ALLOCATED' && !cc.departmentId) return false;
        if (scopeFilter === 'UNALLOCATED' && !!cc.departmentId) return false;

        // Department filter
        if (departmentFilter !== 'ALL') {
          if (departmentFilter === 'UNALLOCATED' && !!cc.departmentId) return false;
          if (departmentFilter !== 'UNALLOCATED' && cc.departmentId !== departmentFilter) return false;
        }

        // Search filter
        if (search.trim()) {
          const query = search.toLowerCase();
          const matchCode = cc.code.toLowerCase().includes(query);
          const matchName = cc.name.toLowerCase().includes(query);
          const matchDesc = cc.description?.toLowerCase().includes(query);
          const dept = getDept(cc.departmentId);
          const matchDept = dept ? dept.name.toLowerCase().includes(query) || dept.code.toLowerCase().includes(query) : false;
          if (!matchCode && !matchName && !matchDesc && !matchDept) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'code') {
          diff = a.code.localeCompare(b.code);
        } else if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'department') {
          const deptA = getDept(a.departmentId)?.name || '';
          const deptB = getDept(b.departmentId)?.name || '';
          diff = deptA.localeCompare(deptB);
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [costCenters, departments, scopeFilter, departmentFilter, search, sortBy, sortOrder]);

  const tableColumns: Column<CostCenter>[] = [
    {
      header: 'Cost Center Code',
      accessorKey: 'code',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
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
        const dept = getDept(row.departmentId);
        return dept ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>{dept.name}</span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {dept.code}
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 italic">
            Unallocated
          </span>
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

          <Tooltip
            content={row.status === 'ACTIVE' ? 'Deactivate Cost Center' : 'Activate Cost Center'}
            placement="top"
          >
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
      {/* 1. Page Header */}
      <PageHeader
        title="Cost Centers & Accounting Units"
        description="Define financial accounting codes, operational budgets, and department cost allocations."
        actions={
          <Button size="sm" onClick={handleOpenAdd} className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Cost Center
          </Button>
        }
      />

      {/* 2. Top Metric Counters (Color Cards matching UserListPage pattern, zero shadows, rounded-md) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ${card.ring}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${card.from} ${card.to} text-white`}
            >
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">
                {card.value}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Rich Colorful Filter Panel Card (matching UserListPage pattern) */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 transition-all">
        {/* Top Quick Scope Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-amber-500" />
              Scope:
            </span>
            {[
              { label: 'All Centers', value: 'ALL' },
              { label: 'Active Only', value: 'ACTIVE' },
              { label: 'Allocated to Dept', value: 'ALLOCATED' },
              { label: 'Unallocated', value: 'UNALLOCATED' },
              { label: 'Inactive', value: 'INACTIVE' },
            ].map((pill) => {
              const isActive = scopeFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setScopeFilter(pill.value as ScopeFilter)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border select-none ${
                    isActive
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 border border-amber-100 dark:border-amber-900/40 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{costCenters.length} centers in ledger</span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'cards'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
                title="Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
                title="Table View"
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchInput
            label="Search Cost Centers"
            value={search}
            onChange={(val) => setSearch(val)}
            onClear={() => setSearch('')}
            placeholder="Search by code, name, department..."
          />

          <SelectField
            label="Allocated Department"
            placeholder="All Departments"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Departments' },
              { value: 'UNALLOCATED', label: 'Unallocated Units Only' },
              ...departments.map((d) => ({
                value: d._id,
                label: `${d.code} - ${d.name}`,
              })),
            ]}
          />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SelectField
                label="Sort Order"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                options={[
                  { value: 'code', label: 'Cost Center Code' },
                  { value: 'name', label: 'Cost Center Name' },
                  { value: 'department', label: 'Allocated Department' },
                ]}
              />
            </div>
            <div className="pt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="h-9 px-2.5"
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(!!search || scopeFilter !== 'ALL' || departmentFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Filters:
            </span>

            {search && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                Search: "{search}"
                <X
                  className="h-3 w-3 cursor-pointer hover:text-amber-900 dark:hover:text-amber-100"
                  onClick={() => setSearch('')}
                />
              </span>
            )}

            {scopeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                Scope: {scopeFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-amber-900 dark:hover:text-amber-100"
                  onClick={() => setScopeFilter('ALL')}
                />
              </span>
            )}

            {departmentFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                Dept: {departmentFilter === 'UNALLOCATED' ? 'Unallocated' : getDept(departmentFilter)?.code || departmentFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-indigo-900 dark:hover:text-indigo-100"
                  onClick={() => setDepartmentFilter('ALL')}
                />
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setScopeFilter('ALL');
                setDepartmentFilter('ALL');
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-600 underline cursor-pointer ml-auto"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Main View: Cards Grid or Table View */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-48 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : viewMode === 'cards' ? (
        filteredCostCenters.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900">
            <Landmark className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No cost centers found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No accounting units match the current filter or search criteria.
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-4">
              Add Cost Center
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredCostCenters.map((cc) => {
              const dept = getDept(cc.departmentId);
              return (
                <div
                  key={cc._id}
                  className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 flex flex-col justify-between hover:border-amber-500/40 transition-all group"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                          <Landmark className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 block truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {cc.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate block">
                            {cc.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <StatusBadge status={cc.status} />
                        <Tooltip content="Edit Cost Center" placement="top">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cc)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            aria-label="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={cc.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          placement="top"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setTargetCC(cc);
                              setDialogOpen(true);
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              cc.status === 'ACTIVE'
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                            aria-label="Toggle Status"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px] mb-3">
                      {cc.description || 'No ledger description provided for this accounting center.'}
                    </p>

                    {/* Department Allocation Badge */}
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2.5 mb-3 border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Allocated Division
                      </span>
                      {dept ? (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            {dept.name}
                          </span>
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40">
                            {dept.code}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-slate-400 italic">
                          <span>Unassigned to any division</span>
                          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            Unallocated
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      ID: {cc._id.slice(0, 8)}...
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cc)}
                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Manage Center →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <DataTable
          data={filteredCostCenters}
          columns={tableColumns}
          isLoading={isLoading}
          onAddClick={handleOpenAdd}
          addLabel="Add Cost Center"
          emptyTitle="No cost centers configured"
          emptyDescription="Create cost centers to enable payroll accounting and expense reporting."
        />
      )}

      {/* 5. Create / Edit Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingCC ? 'Edit Cost Center' : 'Create Cost Center'}
        description="Configure budget identification code, accounting title, and primary department owner."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Cost Center Code"
            placeholder="e.g. CC-ENG-001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={formErrors.code}
            required
          />

          <Input
            label="Cost Center Name"
            placeholder="e.g. Core Platform Engineering"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
          />

          <SelectField
            label="Allocated Department (Optional)"
            placeholder="Select Department"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            options={[
              { value: '', label: 'Unallocated (Company-Wide)' },
              ...departments.map((d) => ({
                value: d._id,
                label: `${d.code} - ${d.name}`,
              })),
            ]}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Accounting purpose, project code or cost-allocation notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editingCC
                ? 'Update Cost Center'
                : 'Create Cost Center'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* 6. Toggle Status Dialog */}
      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={
          targetCC?.status === 'ACTIVE'
            ? 'Deactivate Cost Center?'
            : 'Activate Cost Center?'
        }
        message={
          targetCC?.status === 'ACTIVE'
            ? `Deactivating "${targetCC?.code}" will prevent new operational budget allocations.`
            : `Activating "${targetCC?.code}" will make it available for financial assignments.`
        }
        confirmText={
          isToggling
            ? 'Updating...'
            : targetCC?.status === 'ACTIVE'
            ? 'Deactivate'
            : 'Activate'
        }
        variant={targetCC?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
