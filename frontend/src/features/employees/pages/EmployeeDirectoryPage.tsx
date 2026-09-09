import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Users,
  UserCheck,
  Hourglass,
  Download,
  Mail,
  Phone,
  Building2,
  Eye,
  Edit2,
  Trash2,
  Filter,
  RefreshCw,
  Send,
  MoreHorizontal,
  Network,
  Handshake,
  Briefcase,
} from 'lucide-react';
import { Button, SelectField, Avatar, Tooltip, Dropdown, SearchInput } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, type Column } from '../../../components/data-table/DataTable';
import { ViewToolbar, ToolbarAction } from '../../../components/data-table/ViewToolbar';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import { AssignReportingHrModal } from '../components/AssignReportingHrModal';
import { AssignManagerModal } from '../components/AssignManagerModal';
import { ChangeDesignationModal } from '../components/ChangeDesignationModal';
import { canEditEmployment } from '../utils/employee-permissions';
import { useAuth } from '../../auth/context/AuthContext';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Employee, EmployeeStats } from '../types/employees.types';
import type { Department, Designation } from '../../organization/types/organization.types';

/** Human-readable lifecycle labels for the card view. */
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  PROBATION: 'Probation',
  ON_LEAVE: 'On Leave',
  SUSPENDED: 'Suspended',
  RESIGNED: 'Resigned',
  TERMINATED: 'Terminated',
  INACTIVE: 'Inactive',
};

/**
 * Card tinting per status: a quiet pill at rest, the whole card washing to the
 * status colour on hover. Colour is never the only signal — the pill always
 * carries the label too.
 */
const STATUS_CARD_TONE: Record<string, { pill: string; card: string }> = {
  ACTIVE: {
    pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    card: 'hover:border-emerald-200 hover:bg-emerald-50/70 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20',
  },
  PROBATION: {
    pill: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    card: 'hover:border-amber-200 hover:bg-amber-50/70 dark:hover:border-amber-900 dark:hover:bg-amber-950/20',
  },
  ON_LEAVE: {
    pill: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    card: 'hover:border-rose-200 hover:bg-rose-50/70 dark:hover:border-rose-900 dark:hover:bg-rose-950/20',
  },
  SUSPENDED: {
    pill: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    card: 'hover:border-rose-200 hover:bg-rose-50/70 dark:hover:border-rose-900 dark:hover:bg-rose-950/20',
  },
  RESIGNED: {
    pill: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    card: 'hover:bg-surface-2',
  },
  TERMINATED: {
    pill: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    card: 'hover:bg-surface-2',
  },
  INACTIVE: {
    pill: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    card: 'hover:bg-surface-2',
  },
  DEFAULT: {
    pill: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    card: 'hover:bg-surface-2',
  },
};

export function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const mayEditEmployment = canEditEmployment(user);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dropdown reference data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedDesig, setSelectedDesig] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Server-side aggregation for the headline tiles (null = unavailable)
  const [stats, setStats] = useState<EmployeeStats | null>(null);

  // Debounced so typing does not fire a request per keystroke
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Lifted out of DataTable so the switcher can sit in the view toolbar
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Status Modal State
  const [statusModalTarget, setStatusModalTarget] = useState<Employee | null>(null);

  // Quick-action targets (assign reporting HR / manager / designation)
  const [hrTarget, setHrTarget] = useState<Employee | null>(null);
  const [managerTarget, setManagerTarget] = useState<Employee | null>(null);
  const [designationTarget, setDesignationTarget] = useState<Employee | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchFiltersData = async () => {
    try {
      const [deptRes, desigRes] = await Promise.all([
        organizationApi.getDepartments(),
        organizationApi.getDesignations(),
      ]);
      setDepartments(deptRes || []);
      setDesignations(desigRes || []);
    } catch {
      // Non-blocking filter options fetch
    }
  };

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await employeesApi.getEmployees({
        page,
        pageSize,
        search: debouncedSearch.trim() || undefined,
        departmentId: selectedDept !== 'ALL' ? selectedDept : undefined,
        designationId: selectedDesig !== 'ALL' ? selectedDesig : undefined,
        employmentType: selectedType !== 'ALL' ? selectedType : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      });
      setEmployees(res.data || []);
      setTotalItems(res.meta?.totalItems ?? (res.data ? res.data.length : 0));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to retrieve employee directory.', 'Error Loading Directory');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedDept, selectedDesig, selectedType, selectedStatus, toast]);

  /*
   * One server-side aggregation for the headline tiles.
   *
   * This previously fired three paginated probes (pageSize=1, read meta) and
   * repeated all three on every filter change. `GET /employees/stats` returns
   * the same figures — plus new joiners and the department count — in a single
   * request, and because the tiles are organization-wide totals it only needs
   * to run once rather than on every filter change.
   */
  const fetchStats = useCallback(async () => {
    try {
      setStats(await employeesApi.getStats());
    } catch {
      setStats(null); // Tiles fall back to "—" rather than showing a stale figure
    }
  }, []);

  const handleStatusChange = async (status: string, reason?: string, effectiveDate?: string) => {
    if (!statusModalTarget) return;
    try {
      await employeesApi.changeEmployeeStatus(statusModalTarget._id, status, reason, effectiveDate);
      toast.success(`${statusModalTarget.displayName || statusModalTarget.firstName} status updated to ${status}.`, 'Status Updated');
      setStatusModalTarget(null);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change status.', 'Update Error');
    }
  };

  const handleResendCredentials = async (emp: Employee) => {
    if (!emp.personalEmail) {
      toast.error('This employee does not have a registered personal email address.', 'Missing Personal Email');
      return;
    }
    try {
      const res = await employeesApi.resendOnboarding(emp._id);
      toast.success(res.message, 'Credentials Dispatched');
      fetchEmployees();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend credentials.', 'Delivery Failed');
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Organization-wide totals: fetched once, not per filter change.
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // 350ms after the last keystroke, so a search fires one request rather than
  // one per character.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await employeesApi.exportEmployeesCsv({
        departmentId: selectedDept !== 'ALL' ? selectedDept : undefined,
      });
      toast.success('Employee directory exported successfully.', 'CSV Export Initiated');
    } catch {
      toast.error('Could not export employee roster.', 'Export Failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await employeesApi.deleteEmployee(deleteTarget._id);
      toast.success(`${deleteTarget.displayName || deleteTarget.firstName} has been removed from active directory.`, 'Employee Archived');
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to archive employee.', 'Delete Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  /** Headline counters, same treatment as the security roster. */
  const metricCards = [
    {
      label: 'Total Headcount',
      value: stats ? stats.total.toLocaleString() : '—',
      icon: Users,
      from: 'from-indigo-500',
      to: 'to-violet-600',
      ring: 'ring-indigo-500/20',
    },
    {
      label: 'Active',
      value: stats ? (stats.byStatus.ACTIVE ?? 0).toLocaleString() : '—',
      icon: UserCheck,
      from: 'from-emerald-500',
      to: 'to-teal-500',
      ring: 'ring-emerald-500/20',
    },
    {
      label: 'On Probation',
      value: stats ? (stats.byStatus.PROBATION ?? 0).toLocaleString() : '—',
      icon: Hourglass,
      from: 'from-amber-500',
      to: 'to-orange-500',
      ring: 'ring-amber-500/20',
    },
    {
      label: 'New This Month',
      value: stats ? stats.newJoinersThisMonth.toLocaleString() : '—',
      icon: UserPlus,
      from: 'from-sky-500',
      to: 'to-cyan-500',
      ring: 'ring-sky-500/20',
    },
    {
      label: 'Departments',
      value: (stats?.departmentCount ?? departments.length).toLocaleString(),
      icon: Building2,
      from: 'from-rose-500',
      to: 'to-pink-500',
      ring: 'ring-rose-500/20',
    },
  ];

  const activeFilterCount = [selectedDept, selectedDesig, selectedType, selectedStatus].filter(
    (v) => v !== 'ALL',
  ).length + (search.trim() ? 1 : 0);

  const resetFilters = () => {
    setSelectedDept('ALL');
    setSelectedDesig('ALL');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setSearch('');
    setPage(1);
  };

  const formatHiredDate = (value: string) =>
    value
      ? new Date(value).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60">
            ACTIVE
          </span>
        );
      case 'PROBATION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60">
            PROBATION
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60">
            ON LEAVE
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60">
            SUSPENDED
          </span>
        );
      case 'RESIGNED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60">
            RESIGNED
          </span>
        );
      case 'TERMINATED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60">
            TERMINATED
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  const columns: Column<Employee>[] = [
    {
      header: 'Employee',
      sortable: true,
      accessorKey: 'firstName',
      cell: (row) => (
        <div
          onClick={() => navigate(`/employees/${row._id}`)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <Avatar
            src={row.avatarUrl}
            name={row.displayName || `${row.firstName} ${row.lastName}`}
            size="sm"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-[#524b6e] transition-colors dark:text-slate-100 dark:group-hover:text-indigo-400">
              {row.displayName || `${row.firstName} ${row.lastName}`}
            </p>
            <p className="font-mono text-xs text-slate-400 dark:text-slate-500">
              {row.employeeCode}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Work Email & Phone',
      cell: (row) => (
        <div>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-slate-400" />
            <span>{row.workEmail}</span>
          </p>
          {row.phone && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Phone className="h-2.5 w-2.5" />
              <span>{row.phone}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Department & Role',
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {row.designationTitle || '—'}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-slate-400" />
            <span>{row.departmentName || 'Unassigned'}</span>
          </p>
        </div>
      ),
    },
    {
      header: 'Reporting Manager',
      cell: (row) => (
        row.manager ? (
          <div className="flex items-center gap-2">
            <Avatar
              src={row.manager.avatarUrl}
              name={row.manager.displayName || `${row.manager.firstName} ${row.manager.lastName}`}
              size="xs"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {row.manager.displayName || `${row.manager.firstName} ${row.manager.lastName}`}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Tooltip content="View Profile" placement="top">
            <button
              type="button"
              onClick={() => navigate(`/employees/${row._id}`)}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#524b6e] transition-colors cursor-pointer dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              aria-label="View Profile"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Edit Profile" placement="top">
            <button
              type="button"
              onClick={() => navigate(`/employees/${row._id}/edit`)}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Edit Profile"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          <Tooltip content="Change Status" placement="top">
            <button
              type="button"
              onClick={() => setStatusModalTarget(row)}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer dark:hover:bg-slate-800 dark:hover:text-indigo-400"
              aria-label="Change Lifecycle Status"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          {mayEditEmployment && (
            <Tooltip content="Assign Reporting HR" placement="top">
              <button
                type="button"
                onClick={() => setHrTarget(row)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors cursor-pointer dark:hover:bg-violet-950/40 dark:hover:text-violet-400"
                aria-label="Assign Reporting HR"
              >
                <Handshake className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}

          {mayEditEmployment && (
            <Tooltip content="Assign Manager" placement="top">
              <button
                type="button"
                onClick={() => setManagerTarget(row)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                aria-label="Assign Manager"
              >
                <UserCheck className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}

          {mayEditEmployment && (
            <Tooltip content="Change Designation" placement="top">
              <button
                type="button"
                onClick={() => setDesignationTarget(row)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                aria-label="Change Designation"
              >
                <Briefcase className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}

          {row.personalEmail && (
            <Tooltip content="Resend Credentials" placement="top">
              <button
                type="button"
                onClick={() => handleResendCredentials(row)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors cursor-pointer dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                aria-label="Resend Credentials"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}

          <Tooltip content="Archive Employee" placement="top">
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              aria-label="Archive Employee"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  // Grid Card View Renderer
  const renderCard = (employee: Employee) => {
    const fullName = employee.displayName || `${employee.firstName} ${employee.lastName}`;
    const tone = STATUS_CARD_TONE[employee.status] || STATUS_CARD_TONE.DEFAULT;

    return (
      <div
        className={cn(
          'group flex h-full flex-col overflow-hidden rounded-md border transition-colors',
          'border-hairline bg-surface',
          // The whole card takes on its status colour on hover, so scanning a
          // wall of cards for who is on leave needs no legend.
          tone.card,
        )}
      >
        <div className="flex items-start justify-between gap-2 p-3 pb-0">
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
              tone.pill,
            )}
          >
            {STATUS_LABEL[employee.status] || employee.status}
          </span>

          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                aria-label={`Actions for ${fullName}`}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-hairline bg-surface text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            }
          >
            <button
              type="button"
              onClick={() => navigate(`/employees/${employee._id}`)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
            <button
              type="button"
              onClick={() => navigate(`/employees/${employee._id}/edit`)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
            {mayEditEmployment && (
              <button
                type="button"
                onClick={() => setHrTarget(employee)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Handshake className="h-3.5 w-3.5" />
                Assign HR
              </button>
            )}
            {mayEditEmployment && (
              <button
                type="button"
                onClick={() => setManagerTarget(employee)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Assign Manager
              </button>
            )}
            {mayEditEmployment && (
              <button
                type="button"
                onClick={() => setDesignationTarget(employee)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Briefcase className="h-3.5 w-3.5" />
                Change Designation
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteTarget(employee)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </Dropdown>
        </div>

        {/* Identity */}
        <div className="flex flex-col items-center px-4 pb-4 pt-1 text-center">
          <button
            type="button"
            onClick={() => navigate(`/employees/${employee._id}`)}
            className="cursor-pointer overflow-hidden rounded-md"
          >
            {/* twMerge lets the explicit size win over the `xl` preset. */}
            <Avatar
              src={employee.avatarUrl}
              name={fullName}
              size="xl"
              shape="rounded"
              className="h-24 w-24"
            />
          </button>

          <h4
            onClick={() => navigate(`/employees/${employee._id}`)}
            className="mt-3 cursor-pointer truncate text-[15px] font-semibold text-ink transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
            title={fullName}
          >
            {fullName}
          </h4>
          <p className="mt-0.5 truncate text-[12px] text-indigo-600 dark:text-indigo-400">
            {employee.designationTitle || 'Staff Member'}
          </p>
        </div>

        {/* Details panel — pinned to the bottom so cards line up in the grid */}
        <div className="mt-auto bg-indigo-50/60 px-4 py-3 dark:bg-indigo-950/20">
          <div className="grid grid-cols-2 gap-x-3">
            <div className="min-w-0 border-r border-indigo-200/70 pr-3 dark:border-indigo-900/60">
              <div className="text-[11px] text-ink-3">Department</div>
              <div className="truncate text-[12px] font-medium text-ink" title={employee.departmentName || undefined}>
                {employee.departmentName || 'Unassigned'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-ink-3">Hired Date</div>
              <div className="truncate text-[12px] font-medium text-ink">
                {formatHiredDate(employee.joiningDate)}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <a
              href={`mailto:${employee.workEmail}`}
              className="flex items-center gap-2 text-[12px] text-ink-2 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span className="truncate" title={employee.workEmail}>
                {employee.workEmail}
              </span>
            </a>
            <a
              href={employee.phone ? `tel:${employee.phone}` : undefined}
              className={cn(
                'flex items-center gap-2 text-[12px] text-ink-2',
                employee.phone && 'transition-colors hover:text-indigo-600 dark:hover:text-indigo-400',
              )}
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span className="truncate">{employee.phone || 'Not provided'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Shared header, same as every other management page */}
      <PageHeader
        title="Employee Directory"
        description="Master roster of all corporate personnel, reporting hierarchy, and team assignments."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/organization/chart')}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Network className="h-3.5 w-3.5 text-teal-600" />
              <span>Org Chart View</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/employees/new')}
              className="flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Employee</span>
            </Button>
          </div>
        }
      />

      {/* Organization-wide totals from one aggregation endpoint */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={cn(
              'flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3.5 ring-1 dark:border-slate-800 dark:bg-slate-950',
              card.ring,
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white',
                card.from,
                card.to,
              )}
            >
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none text-slate-900 dark:text-slate-100">
                {card.value}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* View switcher + table-scoped actions */}
      <ViewToolbar
        activeView={viewMode}
        availableViews={['table', 'cards']}
        onViewChange={(view) => setViewMode(view === 'cards' ? 'cards' : 'table')}
        actions={
          <>
            <ToolbarAction icon={Download} onClick={handleExport} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export Table'}
            </ToolbarAction>
            <ToolbarAction icon={RefreshCw} onClick={fetchEmployees}>
              Refresh
            </ToolbarAction>
          </>
        }
      />

      {/* Filter panel — pills for the common cuts, labelled inputs for the rest */}
      <div className="space-y-3.5 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {/* Quick status pills + live result count */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Filter className="h-3 w-3 text-indigo-500" />
              Status:
            </span>
            {[
              { label: 'All Employees', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Probation', value: 'PROBATION' },
              { label: 'On Leave', value: 'ON_LEAVE' },
              { label: 'Exited', value: 'RESIGNED' },
            ].map((pill) => {
              const isActive = selectedStatus === pill.value;
              const count = pill.value === 'ALL' ? stats?.total : stats?.byStatus[pill.value];

              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(pill.value);
                    setPage(1);
                  }}
                  className={cn(
                    'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <span>{pill.label}</span>
                  {/* Counts come from the same aggregation as the tiles, so a
                      pill shows its size before it is clicked. */}
                  {count !== undefined && (
                    <span
                      className={cn(
                        'rounded px-1 text-[10px] font-bold',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span>{isLoading ? 'Loading…' : `${totalItems.toLocaleString()} matching records`}</span>
          </div>
        </div>

        {/* Five inputs across five columns — the row fills rather than leaving gaps */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SearchInput
            label="Search Directory"
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Name, code or email..."
          />

          <SelectField
            label="Department"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Departments' },
              ...departments.map((d) => ({
                value: d._id,
                label: `${d.name} (${d.code})`,
              })),
            ]}
          />

          <SelectField
            label="Designation"
            value={selectedDesig}
            onChange={(e) => {
              setSelectedDesig(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Roles' },
              ...designations.map((d) => ({
                value: d._id,
                label: `${d.title} (Grade ${d.grade})`,
              })),
            ]}
          />

          <SelectField
            label="Employment Type"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Types' },
              { value: 'FULL_TIME', label: 'Full Time' },
              { value: 'PART_TIME', label: 'Part Time' },
              { value: 'CONTRACT', label: 'Contract' },
              { value: 'INTERN', label: 'Intern' },
              { value: 'TEMPORARY', label: 'Temporary' },
            ]}
          />

          <SelectField
            label="Lifecycle Status"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PROBATION', label: 'Probation' },
              { value: 'ON_LEAVE', label: 'On Leave' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'RESIGNED', label: 'Resigned' },
              { value: 'TERMINATED', label: 'Terminated' },
            ]}
          />
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-[11.5px] dark:border-slate-800">
            <span className="text-ink-3">
              {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="cursor-pointer font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Dual Mode Table / Grid Cards with Reusable Pagination */}
      <DataTable
        data={employees}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search by name, email, employee code..."
        searchKey={(row) => `${row.firstName} ${row.lastName} ${row.employeeCode} ${row.workEmail}`}
        emptyTitle="No Employees Found"
        emptyDescription="Get started by onboarding your first organization employee."
        onAddClick={() => navigate('/employees/new')}
        addLabel="Add Employee"
        renderCard={renderCard}
        hideToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Confirmation Modal for Employee Archive */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Archive Employee Record"
        description={`Are you sure you want to archive ${deleteTarget?.displayName || deleteTarget?.firstName}? Their account status will transition to TERMINATED.`}
        confirmLabel={isDeleting ? 'Archiving...' : 'Archive Employee'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Lifecycle Status Transition Modal */}
      {statusModalTarget && (
        <StatusTransitionModal
          isOpen={!!statusModalTarget}
          onClose={() => setStatusModalTarget(null)}
          employeeName={statusModalTarget.displayName || `${statusModalTarget.firstName} ${statusModalTarget.lastName}`}
          currentStatus={statusModalTarget.status}
          onConfirm={handleStatusChange}
        />
      )}

      {/* Quick actions: assign reporting HR / manager / designation */}
      {hrTarget && (
        <AssignReportingHrModal
          isOpen={!!hrTarget}
          employee={hrTarget}
          onClose={() => setHrTarget(null)}
          onSaved={fetchEmployees}
        />
      )}
      {managerTarget && (
        <AssignManagerModal
          isOpen={!!managerTarget}
          employee={managerTarget}
          onClose={() => setManagerTarget(null)}
          onSaved={fetchEmployees}
        />
      )}
      {designationTarget && (
        <ChangeDesignationModal
          isOpen={!!designationTarget}
          employee={designationTarget}
          onClose={() => setDesignationTarget(null)}
          onSaved={fetchEmployees}
        />
      )}
    </div>
  );
}
