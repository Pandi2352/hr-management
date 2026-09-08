import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { SearchInput } from '../../../components/ui/SearchInput';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Tooltip } from '../../../components/ui/tooltip';
import { Drawer } from '../../../components/overlay/Drawer';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { Department, CostCenter } from '../types/organization.types';
import { PageHeader } from '../../../components/common/PageHeader';
import {
  Building2,
  Users,
  Network,
  Plus,
  ArrowUpDown,
  Edit2,
  Power,
  Layers,
  CreditCard,
  FolderTree,
  LayoutGrid,
  List,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  GitBranch,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TreeNode extends Department {
  children: TreeNode[];
}

// Palette mapping based on department code/name for visual distinction
const DEPT_TONES = [
  {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800/40',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    progress: 'bg-indigo-500',
  },
  {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800/40',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    progress: 'bg-sky-500',
  },
  {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    progress: 'bg-emerald-500',
  },
  {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800/40',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    progress: 'bg-violet-500',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/40',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    progress: 'bg-amber-500',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/40',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    progress: 'bg-rose-500',
  },
  {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800/40',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
    progress: 'bg-teal-500',
  },
];

function getDeptTone(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return DEPT_TONES[Math.abs(hash) % DEPT_TONES.length];
}

export function DepartmentsPage() {
  const toast = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Mode: Cards Grid (Default), Hierarchy Tree, or Table
  const [viewMode, setViewMode] = useState<'cards' | 'tree' | 'table'>('cards');

  // Search & Filter controls (aligned with User List patterns)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'ROOT_ONLY'>('ALL');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'members'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Hierarchy Tree expanded IDs
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(new Set());

  // Specific Department Hierarchy Inspection Drawer
  const [hierarchyFocusDept, setHierarchyFocusDept] = useState<Department | null>(null);

  // Drawer state (Create / Edit)
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
      // Expand all tree nodes by default
      setExpandedTreeIds(new Set((deptList || []).map((d) => d._id)));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  // Metrics computation from real database records
  const metrics = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.status === 'ACTIVE').length;
    const rootCount = departments.filter((d) => !d.parentId).length;
    const totalMembers = departments.reduce((acc, d) => acc + (d.memberCount || 0), 0);
    const withCostCenter = departments.filter((d) => Boolean(d.costCenterId)).length;
    return { total, active, rootCount, totalMembers, withCostCenter };
  }, [departments]);

  // Color Metric Cards matching UserListPage pattern exactly (gradient icons, ring-1, zero shadows, rounded-md)
  const metricCards = [
    {
      label: 'Total Divisions',
      value: metrics.total,
      icon: Building2,
      from: 'from-indigo-500',
      to: 'to-violet-600',
      ring: 'ring-indigo-500/20',
      caption: 'Configured departments',
    },
    {
      label: 'Active Units',
      value: metrics.active,
      icon: CheckCircle2,
      from: 'from-emerald-500',
      to: 'to-teal-500',
      ring: 'ring-emerald-500/20',
      caption: metrics.total > 0 ? `${Math.round((metrics.active / metrics.total) * 100)}% operational` : '0%',
    },
    {
      label: 'Executive Roots',
      value: metrics.rootCount,
      icon: Layers,
      from: 'from-sky-500',
      to: 'to-blue-600',
      ring: 'ring-sky-500/20',
      caption: 'Top-level divisions',
    },
    {
      label: 'Assigned Staff',
      value: metrics.totalMembers,
      icon: Users,
      from: 'from-violet-500',
      to: 'to-purple-600',
      ring: 'ring-violet-500/20',
      caption: 'Aggregated headcount',
    },
    {
      label: 'Cost Centers',
      value: metrics.withCostCenter,
      icon: CreditCard,
      from: 'from-amber-500',
      to: 'to-orange-500',
      ring: 'ring-amber-500/20',
      caption: 'Budget-allocated',
    },
  ];

  // Full organizational hierarchy tree structured from real database entities
  const fullTreeData = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    departments.forEach((d) => {
      map.set(d._id, { ...d, children: [] });
    });

    departments.forEach((d) => {
      const node = map.get(d._id)!;
      if (d.parentId && map.has(d.parentId)) {
        map.get(d.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [departments]);

  // Map of direct sub-departments (children) for each department
  const childrenMap = useMemo(() => {
    const map = new Map<string, Department[]>();
    departments.forEach((d) => {
      if (d.parentId) {
        const existing = map.get(d.parentId) || [];
        existing.push(d);
        map.set(d.parentId, existing);
      }
    });
    return map;
  }, [departments]);

  // Filtered and sorted data for cards & table
  const filteredDepartments = useMemo(() => {
    return departments
      .filter((dept) => {
        // Status & Hierarchy filter
        if (statusFilter === 'ACTIVE' && dept.status !== 'ACTIVE') return false;
        if (statusFilter === 'INACTIVE' && dept.status !== 'INACTIVE') return false;
        if (statusFilter === 'ROOT_ONLY' && dept.parentId) return false;

        // Cost Center filter
        if (costCenterFilter !== 'ALL') {
          if (costCenterFilter === 'NONE' && dept.costCenterId) return false;
          if (costCenterFilter !== 'NONE' && dept.costCenterId !== costCenterFilter) return false;
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const cc = costCenters.find((c) => c._id === dept.costCenterId);
          const matchName = dept.name.toLowerCase().includes(q);
          const matchCode = dept.code.toLowerCase().includes(q);
          const matchDesc = dept.description?.toLowerCase().includes(q);
          const matchCC = cc && (cc.name.toLowerCase().includes(q) || cc.code.toLowerCase().includes(q));
          return matchName || matchCode || matchDesc || matchCC;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortBy === 'code') {
          comparison = a.code.localeCompare(b.code);
        } else if (sortBy === 'members') {
          comparison = (a.memberCount || 0) - (b.memberCount || 0);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [departments, costCenters, search, statusFilter, costCenterFilter, sortBy, sortOrder]);

  // Drawer handlers
  const handleOpenAdd = (defaultParentId?: string) => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      parentId: defaultParentId || '',
      costCenterId: '',
      description: '',
    });
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

  const getParentDept = (parentId?: string | null) => {
    if (!parentId) return null;
    return departments.find((d) => d._id === parentId) || null;
  };

  const getCostCenter = (costCenterId?: string | null) => {
    if (!costCenterId) return null;
    return costCenters.find((c) => c._id === costCenterId) || null;
  };

  // Ancestry trail for hierarchy drawer
  const getAncestryTrail = (dept: Department): Department[] => {
    const trail: Department[] = [];
    let currentParentId = dept.parentId;
    while (currentParentId) {
      const parent = departments.find((d) => d._id === currentParentId);
      if (!parent || trail.some((t) => t._id === parent._id)) break;
      trail.unshift(parent);
      currentParentId = parent.parentId;
    }
    return trail;
  };

  // Tree expand/collapse toggle
  const toggleTreeExpand = (id: string) => {
    setExpandedTreeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Recursive Tree Node Renderer for the Embedded Full Hierarchy View
  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedTreeIds.has(node._id);
    const tone = getDeptTone(node.code + node.name);
    const costCenter = getCostCenter(node.costCenterId);

    const matchesSearch =
      !search.trim() ||
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.code.toLowerCase().includes(search.toLowerCase());

    return (
      <div key={node._id} className="space-y-1.5">
        <div
          style={{ marginLeft: `${depth * 28}px` }}
          className={cn(
            'flex items-center justify-between p-3 rounded-md border transition-all duration-150',
            matchesSearch
              ? 'border-slate-200 dark:border-slate-800 bg-surface hover:border-[var(--primary)]'
              : 'opacity-40 border-slate-100 dark:border-slate-800/40 bg-surface/50'
          )}
        >
          {/* Left info */}
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleTreeExpand(node._id)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-6 flex items-center justify-center text-slate-300 dark:text-slate-700">
                <CornerDownRight className="h-3.5 w-3.5" />
              </div>
            )}

            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border shrink-0',
                tone.bg,
                tone.text,
                tone.border
              )}
            >
              <Building2 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-ink truncate">{node.name}</span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {node.code}
                </span>
                {depth === 0 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                    Executive Root
                  </span>
                )}
              </div>
              {node.description && (
                <p className="text-xs text-ink-3 truncate max-w-md mt-0.5">{node.description}</p>
              )}
            </div>
          </div>

          {/* Right metadata & actions */}
          <div className="flex items-center gap-4 shrink-0">
            {costCenter && (
              <div className="hidden lg:flex items-center gap-1 text-xs text-ink-2 font-mono">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                <span>{costCenter.code}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-ink-2 font-semibold">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>{node.memberCount || 0} members</span>
            </div>

            <StatusBadge status={node.status} />

            <div className="flex items-center gap-1">
              <Tooltip content="Add sub-division under this department" placement="top">
                <button
                  type="button"
                  onClick={() => handleOpenAdd(node._id)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Add sub-division"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </Tooltip>

              <Tooltip content="Edit department" placement="top">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(node)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </Tooltip>

              <Tooltip content="View branch hierarchy context" placement="top">
                <button
                  type="button"
                  onClick={() => setHierarchyFocusDept(node)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                  aria-label="Inspect branch"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Render child hierarchy */}
        {hasChildren && isExpanded && (
          <div className="space-y-1.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Page Header with Action Button */}
      <PageHeader
        title="Departments & Divisions"
        description="Architectural structure of organizational units, reporting lines, cost centers, and workforce allocation."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => handleOpenAdd()}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </div>
        }
      />

      {/* 2. Top Metric Counters (Color Cards with gradients and ring-1 matching UserListPage exactly, zero shadows, rounded-md) */}
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

      {/* 3. Rich Colorful Filter Panel Card (matching UserListPage pattern exactly) */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 transition-all">
        {/* Top Quick Scope Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-indigo-500" />
              Scope:
            </span>
            {[
              { label: 'All Units', value: 'ALL' },
              { label: 'Active Only', value: 'ACTIVE' },
              { label: 'Root Divisions', value: 'ROOT_ONLY' },
              { label: 'Inactive Units', value: 'INACTIVE' },
            ].map((pill) => {
              const isActive = statusFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setStatusFilter(pill.value as any)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border select-none ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 border border-indigo-100 dark:border-indigo-900/40 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>{departments.length} units in organization</span>
            </div>

            {/* View Mode 3-Way Switcher */}
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'cards'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
                title="Division Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'tree'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
                title="All Departments Hierarchy View"
              >
                <FolderTree className="h-3.5 w-3.5" />
                <span>Hierarchy Tree</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white font-semibold'
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
            label="Search Directory"
            value={search}
            onChange={(val) => setSearch(val)}
            onClear={() => setSearch('')}
            placeholder="Search by name, code, description, or cost center..."
          />

          <SelectField
            label="Cost Center Allocation"
            placeholder="All Cost Centers"
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Cost Centers' },
              { value: 'NONE', label: 'Unallocated Units Only' },
              ...costCenters.map((cc) => ({
                value: cc._id,
                label: `${cc.code} - ${cc.name}`,
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
                  { value: 'name', label: 'Department Name' },
                  { value: 'code', label: 'Department Code' },
                  { value: 'members', label: 'Workforce Members' },
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
        {(!!search || statusFilter !== 'ALL' || costCenterFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Filters:
            </span>

            {search && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                Search: "{search}"
                <X
                  className="h-3 w-3 cursor-pointer hover:text-indigo-900 dark:hover:text-indigo-100"
                  onClick={() => setSearch('')}
                />
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                Scope: {statusFilter === 'ACTIVE' ? 'Active Only' : statusFilter === 'ROOT_ONLY' ? 'Root Divisions' : 'Inactive Units'}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-indigo-900 dark:hover:text-indigo-100"
                  onClick={() => setStatusFilter('ALL')}
                />
              </span>
            )}

            {costCenterFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                Cost Center: {costCenterFilter === 'NONE' ? 'Unallocated' : costCenters.find((c) => c._id === costCenterFilter)?.code || costCenterFilter}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-amber-900 dark:hover:text-amber-100"
                  onClick={() => setCostCenterFilter('ALL')}
                />
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setCostCenterFilter('ALL');
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-rose-600 underline cursor-pointer ml-auto"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Views: Cards, Tree, or Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-64 rounded-md border border-slate-200 dark:border-slate-800 bg-surface animate-pulse p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between">
                <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDepartments.length === 0 ? (
        /* Empty State */
        <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-surface p-12 text-center flex flex-col items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-ink">No departments found</h3>
          <p className="text-xs text-ink-3 max-w-md mt-1 mb-5">
            {search || statusFilter !== 'ALL' || costCenterFilter !== 'ALL'
              ? 'No division records matched the active search query and filter parameters. Clear your filters to view all units.'
              : 'Create departments to organize your workforce, assign employee reporting lines, and track budget allocations.'}
          </p>
          {search || statusFilter !== 'ALL' || costCenterFilter !== 'ALL' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setCostCenterFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleOpenAdd()} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Add First Department
            </Button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* ========================================================= */
        /* VIEW 1: UNIQUE HIGH-AESTHETIC CARDS VIEW                  */
        /* ========================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredDepartments.map((dept) => {
            const tone = getDeptTone(dept.code + dept.name);
            const parent = getParentDept(dept.parentId);
            const costCenter = getCostCenter(dept.costCenterId);
            const subDepartments = childrenMap.get(dept._id) || [];
            const memberCount = dept.memberCount || 0;
            const workforcePercentage =
              metrics.totalMembers > 0 ? Math.round((memberCount / metrics.totalMembers) * 100) : 0;

            return (
              <div
                key={dept._id}
                className={cn(
                  'group relative rounded-md border border-slate-200 dark:border-slate-800 bg-surface flex flex-col justify-between transition-all duration-200 hover:border-indigo-500',
                  dept.status === 'INACTIVE' && 'opacity-75 bg-slate-50/50 dark:bg-slate-900/20'
                )}
              >
                {/* Main Card Information Area */}
                <div className="p-5 pb-4">
                  {/* Top Strip: Icon, Code Badge, Status */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-md border transition-transform duration-200 group-hover:scale-105',
                          tone.bg,
                          tone.text,
                          tone.border
                        )}
                      >
                        <Building2 className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {dept.code}
                        </span>
                      </div>
                    </div>

                    <StatusBadge status={dept.status} />
                  </div>

                  {/* Division Name & Parent Hierarchy Lineage */}
                  <div>
                    <h3 className="text-base font-bold text-ink group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                      {dept.name}
                    </h3>

                    {/* Hierarchy Context Lineage */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {parent ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <CornerDownRight className="h-3 w-3 text-slate-400" />
                          <span>Reports to:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                            {parent.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <Layers className="h-3 w-3" />
                          <span>Executive Root Division</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-ink-3 mt-2.5 line-clamp-2 min-h-[32px] leading-relaxed">
                      {dept.description || 'No division description recorded. Click edit to define departmental mandate.'}
                    </p>
                  </div>

                  {/* Connected Sub-divisions Pill List (Showing Child Hierarchy) */}
                  {subDepartments.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] text-ink-3 font-medium mb-1.5">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <FolderTree className="h-3 w-3 text-indigo-500" />
                          <span>Sub-divisions ({subDepartments.length}):</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setHierarchyFocusDept(dept)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          View branch
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {subDepartments.slice(0, 3).map((sub) => (
                          <span
                            key={sub._id}
                            className="inline-flex items-center gap-1 font-mono text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[130px]"
                            title={sub.name}
                          >
                            {sub.code} · {sub.name}
                          </span>
                        ))}
                        {subDepartments.length > 3 && (
                          <span
                            onClick={() => setHierarchyFocusDept(dept)}
                            className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200"
                          >
                            +{subDepartments.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics & Allocation Box (Strict Zero Shadow, rounded-md) */}
                  <div className="mt-4 rounded-md border border-slate-100 dark:border-slate-800/80 bg-surface-2 p-3 space-y-2.5">
                    {/* Workforce allocation row */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 text-ink-2 font-medium">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          Workforce
                        </span>
                        <span className="font-bold text-ink font-mono">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      {/* Headcount Capacity Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', tone.progress)}
                          style={{ width: `${Math.max(workforcePercentage, 4)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-ink-3 mt-1">
                        <span>Headcount weight</span>
                        <span>{workforcePercentage}% of company</span>
                      </div>
                    </div>

                    {/* Cost Center Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                      <span className="flex items-center gap-1.5 text-ink-2 font-medium">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        Cost Center
                      </span>
                      {costCenter ? (
                        <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[150px]">
                          {costCenter.code} · {costCenter.name}
                        </span>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">Unallocated</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-5 py-3 bg-surface-1">
                  {/* Inspect branch in hierarchy */}
                  <button
                    type="button"
                    onClick={() => setHierarchyFocusDept(dept)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <Network className="h-3.5 w-3.5" />
                    <span>View Hierarchy</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Tooltip content="Add sub-division under this department" placement="top">
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(dept._id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                        aria-label="Add sub-department"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>

                    <Tooltip content="Edit department specifications" placement="top">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(dept)}
                        className="flex h-7 items-center gap-1 px-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    </Tooltip>

                    <Tooltip
                      content={dept.status === 'ACTIVE' ? 'Deactivate Department' : 'Activate Department'}
                      placement="top"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTargetDept(dept);
                          setDeactivateDialogOpen(true);
                        }}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-md border transition-colors cursor-pointer',
                          dept.status === 'ACTIVE'
                            ? 'border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-slate-700 dark:hover:bg-rose-950/30'
                            : 'border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-950/30'
                        )}
                        aria-label={dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'tree' ? (
        /* ========================================================= */
        /* VIEW 2: ALL DEPARTMENTS FULL HIERARCHY TREE VIEW          */
        /* ========================================================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink">
                Organizational Hierarchy Tree ({departments.length} units total)
              </span>
              <span className="text-[11px] text-ink-3">
                · Connected reporting lines from root down to sub-units
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedTreeIds(new Set(departments.map((d) => d._id)))}
              >
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpandedTreeIds(new Set())}>
                Collapse All
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-surface p-4 space-y-2">
            {fullTreeData.map((root) => renderTreeNode(root, 0))}
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW 3: COMPACT TABULAR VIEW                              */
        /* ========================================================= */
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 border-b border-slate-200 dark:border-slate-800 text-ink-3 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Reports To</th>
                  <th className="px-4 py-3">Sub-divisions</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Cost Center</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredDepartments.map((dept) => {
                  const tone = getDeptTone(dept.code + dept.name);
                  const parent = getParentDept(dept.parentId);
                  const costCenter = getCostCenter(dept.costCenterId);
                  const subDepartments = childrenMap.get(dept._id) || [];

                  return (
                    <tr key={dept._id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-md border shrink-0',
                              tone.bg,
                              tone.text,
                              tone.border
                            )}
                          >
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-ink text-sm">{dept.name}</div>
                            {dept.description && (
                              <div className="text-[11px] text-ink-3 line-clamp-1 max-w-[280px]">
                                {dept.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {dept.code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-ink-2">
                        {parent ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <CornerDownRight className="h-3 w-3 text-slate-400" />
                            {parent.name}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Root Unit
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-ink-2">
                        {subDepartments.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setHierarchyFocusDept(dept)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                          >
                            <FolderTree className="h-3 w-3" />
                            <span>{subDepartments.length} sub-units</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-ink">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold">{dept.memberCount || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-ink-2">
                        {costCenter ? (
                          <span className="font-mono text-xs bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {costCenter.code} · {costCenter.name}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={dept.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Tooltip content="Inspect department hierarchy" placement="top">
                            <button
                              type="button"
                              onClick={() => setHierarchyFocusDept(dept)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Network className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>

                          <Tooltip content="Edit Department" placement="top">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(dept)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>

                          <Tooltip
                            content={dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            placement="top"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setTargetDept(dept);
                                setDeactivateDialogOpen(true);
                              }}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer',
                                dept.status === 'ACTIVE'
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              )}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SPECIFIC DEPARTMENT HIERARCHY INSPECTOR DRAWER */}
      <Drawer
        isOpen={!!hierarchyFocusDept}
        onClose={() => setHierarchyFocusDept(null)}
        title={hierarchyFocusDept ? `${hierarchyFocusDept.name} Hierarchy` : 'Department Hierarchy'}
        description="Comprehensive reporting tree, parent lineage, and connected sub-departments"
      >
        {hierarchyFocusDept && (
          <div className="space-y-6">
            {/* Department Summary Card */}
            <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-surface-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {hierarchyFocusDept.code}
                </span>
                <StatusBadge status={hierarchyFocusDept.status} />
              </div>
              <h3 className="text-base font-bold text-ink">{hierarchyFocusDept.name}</h3>
              <p className="text-xs text-ink-3">
                {hierarchyFocusDept.description || 'No description provided.'}
              </p>
              <div className="flex items-center gap-4 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="flex items-center gap-1 font-semibold text-ink">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {hierarchyFocusDept.memberCount || 0} active staff
                </span>
                {hierarchyFocusDept.costCenterId && (
                  <span className="text-ink-2 font-mono text-[11px]">
                    Cost Center: {getCostCenter(hierarchyFocusDept.costCenterId)?.name || 'Linked'}
                  </span>
                )}
              </div>
            </div>

            {/* 1. Parent Lineage Trail (Ancestry) */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-2 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>Executive Parent Lineage</span>
              </div>
              {getAncestryTrail(hierarchyFocusDept).length > 0 ? (
                <div className="space-y-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800/60">
                  {getAncestryTrail(hierarchyFocusDept).map((ancestor, idx) => (
                    <div
                      key={ancestor._id}
                      className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-surface flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">Level {idx + 1}</span>
                        <span className="font-semibold text-ink">{ancestor.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {ancestor.code}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{ancestor.memberCount || 0} staff</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 pl-1 pt-1">
                    <CornerDownRight className="h-4 w-4" />
                    <span>Current Focus: {hierarchyFocusDept.name}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>This unit is a Top-Level Root Division with no parent. It reports directly to the Executive Board.</span>
                </div>
              )}
            </div>

            {/* 2. Direct Sub-divisions (Children) */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5 text-sky-500" />
                  <span>Sub-divisions Under This Unit ({childrenMap.get(hierarchyFocusDept._id)?.length || 0})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const parentId = hierarchyFocusDept._id;
                    setHierarchyFocusDept(null);
                    handleOpenAdd(parentId);
                  }}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Add Sub-division
                </button>
              </div>

              {(childrenMap.get(hierarchyFocusDept._id) || []).length > 0 ? (
                <div className="space-y-2">
                  {(childrenMap.get(hierarchyFocusDept._id) || []).map((child) => (
                    <div
                      key={child._id}
                      className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-surface flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CornerDownRight className="h-3.5 w-3.5 text-slate-400" />
                        <div>
                          <div className="font-bold text-ink">{child.name}</div>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                            {child.code}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-[11px]">{child.memberCount || 0} members</span>
                        <StatusBadge status={child.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-md border border-dashed border-slate-200 dark:border-slate-800 text-xs text-ink-3 text-center">
                  No sub-divisions configured under {hierarchyFocusDept.name}.
                </div>
              )}
            </div>

            {/* Quick Actions Footer inside Drawer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHierarchyFocusDept(null);
                  setViewMode('tree');
                }}
                className="flex items-center gap-1.5"
              >
                <FolderTree className="h-4 w-4" />
                Open in Full Hierarchy View
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = hierarchyFocusDept;
                  setHierarchyFocusDept(null);
                  handleOpenEdit(target);
                }}
              >
                Edit Unit Specs
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* 6. Add / Edit Department Drawer */}
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
            placeholder="No Parent (Top-Level Executive Division)"
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
              placeholder="Describe the department mandate, operations, or key responsibilities..."
              className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent p-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              type="button"
              onClick={() => setDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5">
              {isSubmitting ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* 7. Deactivate / Activate Confirm Dialog */}
      <ConfirmDialog
        isOpen={deactivateDialogOpen}
        onClose={() => setDeactivateDialogOpen(false)}
        onConfirm={handleToggleStatus}
        title={targetDept?.status === 'ACTIVE' ? 'Deactivate Department' : 'Activate Department'}
        description={
          targetDept?.status === 'ACTIVE'
            ? `Are you sure you want to deactivate "${targetDept?.name}" (${targetDept?.code})? Active employees will remain in place, but this unit will be marked as inactive across the organization.`
            : `Are you sure you want to reactivate "${targetDept?.name}" (${targetDept?.code})? It will become available for employee assignments and organizational reporting.`
        }
        confirmText={targetDept?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={targetDept?.status === 'ACTIVE' ? 'danger' : 'primary'}
        isLoading={isDeactivating}
      />
    </div>
  );
}
