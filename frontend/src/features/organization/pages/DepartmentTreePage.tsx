import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, SearchInput, StatusBadge } from '../../../components/ui';
import { Drawer } from '../../../components/overlay/Drawer';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { Department } from '../types/organization.types';
import {
  ChevronRight,
  ChevronDown,
  Building,
  Users,
  Move,
  Info,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TreeNode extends Department {
  children: TreeNode[];
}

export function DepartmentTreePage() {
  const toast = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [search, setSearch] = useState('');
  const [draggedDeptId, setDraggedDeptId] = useState<string | null>(null);
  const [dragOverDeptId, setDragOverDeptId] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const data = await organizationApi.getDepartments();
      setDepartments(data || []);
      // Expand all by default
      const allIds = new Set((data || []).map((d) => d._id));
      setExpandedIds(allIds);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load department hierarchy');
    } finally {
      setIsLoading(false);
    }
  };

  // Build tree from flat array
  const treeData = useMemo(() => {
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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Drag and Drop Hierarchy Updates
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedDeptId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedDeptId && draggedDeptId !== id) {
      setDragOverDeptId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDeptId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetParentId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDeptId(null);

    if (!draggedDeptId || draggedDeptId === targetParentId) {
      setDraggedDeptId(null);
      return;
    }

    try {
      await organizationApi.updateDepartmentParent(draggedDeptId, targetParentId);
      toast.success('Department hierarchy re-linked successfully');
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to move department');
    } finally {
      setDraggedDeptId(null);
    }
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node._id);
    const isSelected = selectedDept?._id === node._id;
    const isDragOver = dragOverDeptId === node._id;

    const matchesSearch =
      !search.trim() ||
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.code.toLowerCase().includes(search.toLowerCase());

    return (
      <div key={node._id} className="space-y-1">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, node._id)}
          onDragOver={(e) => handleDragOver(e, node._id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node._id)}
          onClick={() => setSelectedDept(node)}
          style={{ paddingLeft: `${depth * 28 + 12}px` }}
          className={cn(
            'group flex items-center justify-between py-2 pr-3 rounded-md border transition-all cursor-pointer select-none',
            isSelected
              ? 'bg-indigo-50/80 border-[#524b6e] text-[#524b6e] dark:bg-slate-900 dark:border-indigo-500 dark:text-indigo-400'
              : isDragOver
              ? 'bg-emerald-50 border-dashed border-2 border-emerald-500'
              : matchesSearch
              ? 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800'
              : 'opacity-40 bg-white border-slate-100 dark:bg-slate-950'
          )}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node._id);
                }}
                className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}

            <Building className="h-4 w-4 text-[#524b6e] dark:text-indigo-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {node.name}
            </span>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {node.code}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Users className="h-3 w-3" />
              <span>{node.memberCount || 0}</span>
            </div>
            <StatusBadge status={node.status} />
            <span title="Drag to reparent">
              <Move className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 cursor-grab" />
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link to="/organization/departments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Table View
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Department Hierarchy
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag and drop any department node to re-link parent/child reporting hierarchies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Find node..."
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedIds(new Set(departments.map((d) => d._id)))}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedIds(new Set())}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Root Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverDeptId('root');
        }}
        onDragLeave={() => setDragOverDeptId(null)}
        onDrop={(e) => handleDrop(e, null)}
        className={cn(
          'p-3 rounded-md border text-xs text-center font-medium transition-colors select-none',
          dragOverDeptId === 'root'
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
            : 'border-dashed border-slate-200 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:border-slate-800'
        )}
      >
        Drop department here to promote to Top-Level Organization Root
      </div>

      {/* Tree Render Container */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-slate-400 animate-pulse">
          Building department hierarchy tree...
        </div>
      ) : treeData.length === 0 ? (
        <div className="p-12 text-center rounded-md border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800">
          <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No departments created
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Create departments in the table view to view and reorganize hierarchies here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs dark:bg-slate-950 dark:border-slate-800 space-y-2">
          {treeData.map((root) => renderNode(root, 0))}
        </div>
      )}

      {/* Detail Drawer for Selected Department */}
      <Drawer
        isOpen={!!selectedDept}
        onClose={() => setSelectedDept(null)}
        title="Department Details"
        description="Detailed node information and status metrics"
      >
        {selectedDept && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">NAME</span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {selectedDept.name}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block">CODE</span>
              <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
                {selectedDept.code}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block">STATUS</span>
              <div className="mt-1">
                <StatusBadge status={selectedDept.status} />
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block">ACTIVE MEMBERS</span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {selectedDept.memberCount || 0} employees assigned
              </p>
            </div>

            {selectedDept.description && (
              <div>
                <span className="text-xs font-semibold text-slate-400 block">DESCRIPTION</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {selectedDept.description}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <Link to="/organization/departments" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Edit in Department List
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
