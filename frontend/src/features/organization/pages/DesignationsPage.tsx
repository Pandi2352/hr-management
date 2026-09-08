import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Users,
  Edit2,
  Power,
  Filter,
  X,
  LayoutGrid,
  List,
  CheckCircle2,
  Crown,
  TrendingUp,
  ShieldCheck,
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
import type { Designation } from '../types/organization.types';
import { cn } from '../../../utils/cn';

type ViewMode = 'cards' | 'table';
type ScopeFilter = 'ALL' | 'ACTIVE' | 'EXECUTIVE' | 'MID_LEVEL' | 'JUNIOR' | 'INACTIVE';

export function DesignationsPage() {
  const toast = useToast();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'title' | 'code' | 'grade' | 'members'>('grade');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Deactivate / Activate dialog
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

  // Metrics computation for top 5 color cards
  const metrics = useMemo(() => {
    const total = designations.length;
    const active = designations.filter((d) => d.status === 'ACTIVE').length;
    const executive = designations.filter((d) => (d.grade || 0) >= 8).length;
    const midLevel = designations.filter((d) => (d.grade || 0) >= 4 && (d.grade || 0) <= 7).length;
    const totalAssigned = designations.reduce((acc, d) => acc + (d.assignedEmployeeCount || 0), 0);
    return { total, active, executive, midLevel, totalAssigned };
  }, [designations]);

  const metricCards = [
    {
      label: 'Total Designations',
      value: metrics.total,
      icon: Award,
      from: 'from-purple-500',
      to: 'to-indigo-600',
      ring: 'ring-purple-500/20',
    },
    {
      label: 'Active Roles',
      value: metrics.active,
      icon: CheckCircle2,
      from: 'from-emerald-500',
      to: 'to-teal-500',
      ring: 'ring-emerald-500/20',
    },
    {
      label: 'Executive (Grade 8-10)',
      value: metrics.executive,
      icon: Crown,
      from: 'from-rose-500',
      to: 'to-pink-600',
      ring: 'ring-rose-500/20',
    },
    {
      label: 'Mid-Level (Grade 4-7)',
      value: metrics.midLevel,
      icon: TrendingUp,
      from: 'from-amber-500',
      to: 'to-orange-500',
      ring: 'ring-amber-500/20',
    },
    {
      label: 'Assigned Workforce',
      value: metrics.totalAssigned,
      icon: Users,
      from: 'from-blue-500',
      to: 'to-cyan-600',
      ring: 'ring-blue-500/20',
    },
  ];

  // Filtered & Sorted Designations
  const filteredDesignations = useMemo(() => {
    return designations
      .filter((d) => {
        // Scope filter
        if (scopeFilter === 'ACTIVE' && d.status !== 'ACTIVE') return false;
        if (scopeFilter === 'INACTIVE' && d.status !== 'INACTIVE') return false;
        if (scopeFilter === 'EXECUTIVE' && (d.grade || 0) < 8) return false;
        if (scopeFilter === 'MID_LEVEL' && ((d.grade || 0) < 4 || (d.grade || 0) > 7)) return false;
        if (scopeFilter === 'JUNIOR' && (d.grade || 0) > 3) return false;

        // Specific grade filter
        if (gradeFilter !== 'ALL') {
          if (gradeFilter === 'EXECUTIVE' && (d.grade || 0) < 8) return false;
          if (gradeFilter === 'MID_LEVEL' && ((d.grade || 0) < 4 || (d.grade || 0) > 7)) return false;
          if (gradeFilter === 'JUNIOR' && (d.grade || 0) > 3) return false;
          if (!isNaN(Number(gradeFilter)) && d.grade !== Number(gradeFilter)) return false;
        }

        // Search filter
        if (search.trim()) {
          const query = search.toLowerCase();
          const matchTitle = d.title.toLowerCase().includes(query);
          const matchCode = d.code.toLowerCase().includes(query);
          const matchDesc = d.description?.toLowerCase().includes(query);
          if (!matchTitle && !matchCode && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'title') {
          diff = a.title.localeCompare(b.title);
        } else if (sortBy === 'code') {
          diff = a.code.localeCompare(b.code);
        } else if (sortBy === 'grade') {
          diff = (a.grade || 0) - (b.grade || 0);
        } else if (sortBy === 'members') {
          diff = (a.assignedEmployeeCount || 0) - (b.assignedEmployeeCount || 0);
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [designations, scopeFilter, gradeFilter, search, sortBy, sortOrder]);

  const getSeniorityTier = (grade: number) => {
    if (grade >= 8) return { label: 'Senior Executive', color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50' };
    if (grade >= 4) return { label: 'Mid-Level', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50' };
    return { label: 'Junior', color: 'text-teal-600 bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50' };
  };

  const tableColumns: Column<Designation>[] = [
    {
      header: 'Designation Title',
      accessorKey: 'title',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
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
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Grade / Seniority',
      accessorKey: 'grade',
      sortable: true,
      cell: (row) => {
        const tier = getSeniorityTier(row.grade || 1);
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
              Grade {row.grade}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${tier.color}`}>
              {tier.label}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Assigned Staff',
      accessorKey: 'assignedEmployeeCount',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
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

          <Tooltip
            content={row.status === 'ACTIVE' ? 'Deactivate Designation' : 'Activate Designation'}
            placement="top"
          >
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
      {/* 1. Page Header */}
      <PageHeader
        title="Job Designations & Role Grades"
        description="Configure standard job titles, corporate grade levels (1 to 10), and career progression tracks."
        actions={
          <Button size="sm" onClick={handleOpenAdd} className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Designation
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
              <Filter className="h-3 w-3 text-purple-500" />
              Scope:
            </span>
            {[
              { label: 'All Roles', value: 'ALL' },
              { label: 'Active Only', value: 'ACTIVE' },
              { label: 'Executive (Grade 8-10)', value: 'EXECUTIVE' },
              { label: 'Mid-Level (Grade 4-7)', value: 'MID_LEVEL' },
              { label: 'Junior (Grade 1-3)', value: 'JUNIOR' },
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
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 border border-purple-100 dark:border-purple-900/40 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span>{designations.length} titles in registry</span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'cards'
                    ? 'bg-purple-600 text-white font-semibold'
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
                    ? 'bg-purple-600 text-white font-semibold'
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
            label="Search Designations"
            value={search}
            onChange={(val) => setSearch(val)}
            onClear={() => setSearch('')}
            placeholder="Search by title, code, description..."
          />

          <SelectField
            label="Seniority Grade Tier"
            placeholder="All Grades"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Seniority Grades' },
              { value: 'EXECUTIVE', label: 'Executive Tier (Grades 8 - 10)' },
              { value: 'MID_LEVEL', label: 'Mid-Level Tier (Grades 4 - 7)' },
              { value: 'JUNIOR', label: 'Junior Tier (Grades 1 - 3)' },
              ...Array.from({ length: 10 }, (_, i) => ({
                value: String(i + 1),
                label: `Specific Grade ${i + 1}`,
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
                  { value: 'grade', label: 'Seniority Grade' },
                  { value: 'title', label: 'Designation Title' },
                  { value: 'code', label: 'Role Code' },
                  { value: 'members', label: 'Assigned Staff' },
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
        {(!!search || scopeFilter !== 'ALL' || gradeFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Filters:
            </span>

            {search && (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300">
                Search: "{search}"
                <X
                  className="h-3 w-3 cursor-pointer hover:text-purple-900 dark:hover:text-purple-100"
                  onClick={() => setSearch('')}
                />
              </span>
            )}

            {scopeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300">
                Scope: {scopeFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-purple-900 dark:hover:text-purple-100"
                  onClick={() => setScopeFilter('ALL')}
                />
              </span>
            )}

            {gradeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                Grade: {gradeFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-indigo-900 dark:hover:text-indigo-100"
                  onClick={() => setGradeFilter('ALL')}
                />
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setScopeFilter('ALL');
                setGradeFilter('ALL');
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
        filteredDesignations.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white dark:bg-slate-900">
            <Award className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No designations found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No job roles match the current filter or search criteria.
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-4">
              Add Designation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredDesignations.map((desig) => {
              const tier = getSeniorityTier(desig.grade || 1);
              return (
                <div
                  key={desig._id}
                  className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 flex flex-col justify-between hover:border-purple-500/40 transition-all group"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
                          <Award className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {desig.title}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {desig.code}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <StatusBadge status={desig.status} />
                        <Tooltip content="Edit Designation" placement="top">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(desig)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                            aria-label="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={desig.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          placement="top"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setTargetDesig(desig);
                              setDialogOpen(true);
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              desig.status === 'ACTIVE'
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
                      {desig.description || 'No role description provided.'}
                    </p>

                    {/* Seniority Tier Bar */}
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-2.5 mb-3 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                          Grade {desig.grade}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tier.color}`}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, ((desig.grade || 1) / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      <span>{desig.assignedEmployeeCount || 0} assigned</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(desig)}
                      className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      Manage Role →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <DataTable
          data={filteredDesignations}
          columns={tableColumns}
          isLoading={isLoading}
          onAddClick={handleOpenAdd}
          addLabel="Add Designation"
          emptyTitle="No designations configured"
          emptyDescription="Create designations to establish seniority levels and role job titles."
        />
      )}

      {/* 5. Create / Edit Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingDesig ? 'Edit Designation' : 'Create Designation'}
        description="Specify job title, unique role code, and organizational grade (1-10)."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Designation Title"
            placeholder="e.g. Senior Software Engineer"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={formErrors.title}
            required
          />

          <Input
            label="Designation Code"
            placeholder="e.g. DES-SSE"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            error={formErrors.code}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Seniority Grade (1 to 10)
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Grade 1 (Entry)</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                Grade {formData.grade} - {getSeniorityTier(formData.grade).label}
              </span>
              <span>Grade 10 (Executive)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Role Description
            </label>
            <textarea
              rows={3}
              placeholder="Responsibilities, scope, and qualification benchmarks..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : editingDesig
                ? 'Update Designation'
                : 'Create Designation'}
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
          targetDesig?.status === 'ACTIVE'
            ? 'Deactivate Designation?'
            : 'Activate Designation?'
        }
        message={
          targetDesig?.status === 'ACTIVE'
            ? `Deactivating "${targetDesig?.title}" will prevent assigning it to new employees.`
            : `Activating "${targetDesig?.title}" will make it available for workforce assignments.`
        }
        confirmText={
          isToggling
            ? 'Updating...'
            : targetDesig?.status === 'ACTIVE'
            ? 'Deactivate'
            : 'Activate'
        }
        variant={targetDesig?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
