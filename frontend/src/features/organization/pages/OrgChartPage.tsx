import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Users,
  Building,
  Layers,
  ChevronRight,
  Mail,
  Phone,
  ArrowUpRight,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button, Input, Badge } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { OrgChartNode as OrgChartNodeType, Department } from '../types/organization.types';
import { OrgChartNode } from '../components/OrgChartNode';
import { cn } from '../../../utils/cn';

export function OrgChartPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [roots, setRoots] = useState<OrgChartNodeType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');

  // Expanded Tree State
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Selected Employee for Quick-View Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<OrgChartNodeType | null>(null);

  // Canvas Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [chartData, deptData] = await Promise.all([
        organizationApi.getOrgChart(),
        organizationApi.getDepartments(),
      ]);

      setRoots(chartData.roots || []);
      setTotalEmployees(chartData.totalEmployees || 0);
      setDepartments(deptData || []);

      // By default, expand top 2 levels (root and root's children)
      const initialExpanded = new Set<string>();
      chartData.roots.forEach((root) => {
        initialExpanded.add(root._id);
        if (root.children) {
          root.children.forEach((child) => {
            initialExpanded.add(child._id);
          });
        }
      });
      setExpandedIds(initialExpanded);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load organization chart');
    } finally {
      setIsLoading(false);
    }
  };

  // Collect all employee nodes in a flat array for search lookup
  const allNodes = useMemo(() => {
    const list: OrgChartNodeType[] = [];
    const traverse = (node: OrgChartNodeType) => {
      list.push(node);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    roots.forEach(traverse);
    return list;
  }, [roots]);

  // Handle Search: Auto-expand path to matching employees
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase().trim();
    const match = allNodes.find(
      (n) =>
        n.displayName.toLowerCase().includes(query) ||
        n.employeeCode.toLowerCase().includes(query) ||
        n.designationTitle.toLowerCase().includes(query)
    );

    if (match) {
      // Find ancestor path and expand all ancestors
      const expandSet = new Set(expandedIds);
      let curr: OrgChartNodeType | undefined = match;

      while (curr && curr.managerId) {
        expandSet.add(curr.managerId);
        curr = allNodes.find((n) => n._id === curr?.managerId);
      }
      setExpandedIds(expandSet);
    }
  }, [searchQuery, allNodes]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    allNodes.forEach((n) => allIds.add(n._id));
    setExpandedIds(allIds);
    toast.success('All organizational tiers expanded');
  };

  const handleCollapseAll = () => {
    const rootIds = new Set<string>(roots.map((r) => r._id));
    setExpandedIds(rootIds);
    toast.success('Collapsed to executive tier');
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan Controls (Mouse Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.cursor-pointer')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[75vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="text-xs text-slate-500">Constructing Organizational Chart & Reporting Tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full space-y-4 pb-8 select-none',
        isFullscreen && 'fixed inset-0 z-50 bg-canvas p-6 overflow-hidden space-y-4'
      )}
    >
      {/* Header */}
      <PageHeader
        title="Organization Chart"
        description="Master organizational reporting tree across corporate leadership, departments, and personnel."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              className="flex items-center gap-1 text-xs"
            >
              <Minus className="h-3.5 w-3.5" />
              Collapse All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              className="flex items-center gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Expand All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              className="flex items-center gap-1 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Center View
            </Button>
          </div>
        }
      />

      {/* Control Bar: Search, Department Filter, & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Input
            placeholder="Search employee name, code, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
            className="text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Department Filter */}
        <div className="md:col-span-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full text-xs font-medium rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-teal-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="md:col-span-4 flex items-center justify-end gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-teal-600" />
            <strong className="text-slate-900 dark:text-slate-100">{totalEmployees}</strong> Active Staff
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-sky-600" />
            <strong className="text-slate-900 dark:text-slate-100">{departments.length}</strong> Departments
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            <strong className="text-slate-900 dark:text-slate-100">4</strong> Tiers
          </span>
        </div>
      </div>

      {/* Interactive Pan & Zoom Canvas */}
      <div
        className={cn(
          'relative w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden shadow-xs transition-colors',
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[750px]',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Floating Controls in Top Right (Exact match with reference image) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-md overflow-hidden">
          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset Zoom (100%)"
            className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Current Zoom Level Badge */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 shadow-xs">
          Zoom: {Math.round(zoom * 100)}%
        </div>

        {/* Tree Canvas */}
        <div
          ref={canvasRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="min-w-max p-16 pt-8 flex justify-center items-start"
        >
          {roots.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No organization hierarchy nodes found.
            </div>
          ) : (
            <div className="flex gap-16 items-start justify-center">
              {roots.map((root) => (
                <OrgChartNode
                  key={root._id}
                  node={root}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onSelectEmployee={(emp) => setSelectedEmployee(emp)}
                  searchQuery={searchQuery}
                  selectedDeptId={selectedDeptId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Employee Quick-View Side Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Employee Hierarchy Card
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Profile Card Summary */}
              <div className="flex items-center gap-4">
                {selectedEmployee.avatarUrl ? (
                  <img
                    src={selectedEmployee.avatarUrl}
                    alt={selectedEmployee.displayName}
                    className="h-16 w-16 rounded-full object-cover border-2 border-teal-500 shadow-xs"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-bold text-lg flex items-center justify-center border-2 border-teal-500 shadow-xs">
                    {selectedEmployee.initials}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedEmployee.displayName}
                  </h3>
                  <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                    {selectedEmployee.designationTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-slate-500">
                      ID: {selectedEmployee.employeeCode}
                    </span>
                    <Badge variant="success" size="sm" className="px-1.5 py-0 text-[10px]">
                      {selectedEmployee.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Employment & Organizational Meta */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedEmployee.departmentName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500">Designation Code</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedEmployee.designationCode || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500">Direct Reports</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedEmployee.directReportsCount} members
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Contact Coordinates
                </h4>
                <div className="space-y-2">
                  <a
                    href={`mailto:${selectedEmployee.workEmail}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-teal-600" />
                    <span className="truncate">{selectedEmployee.workEmail}</span>
                  </a>
                  {selectedEmployee.phone && (
                    <a
                      href={`tel:${selectedEmployee.phone}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <Phone className="h-4 w-4 text-teal-600" />
                      <span>{selectedEmployee.phone}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Direct Reports List */}
              {selectedEmployee.children && selectedEmployee.children.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Direct Team ({selectedEmployee.children.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedEmployee.children.map((child) => (
                      <div
                        key={child._id}
                        onClick={() => setSelectedEmployee(child)}
                        className="flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/30 border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {child.initials}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {child.displayName}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {child.designationTitle}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                onClick={() => navigate(`/employees/${selectedEmployee._id}`)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5"
              >
                <span>View Full Employee Profile</span>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrgChartPage;
