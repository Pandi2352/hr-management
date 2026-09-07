import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Download,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Eye,
  Edit2,
  Trash2,
  Filter,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Button, SelectField, Avatar, Tooltip } from '../../../components/ui';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';
import { DataTable, type Column } from '../../../components/data-table/DataTable';
import { ViewToolbar, ToolbarAction } from '../../../components/data-table/ViewToolbar';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Employee } from '../types/employees.types';
import type { Department, Designation } from '../../organization/types/organization.types';

export function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const toast = useToast();

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

  // Server-side totals for the headline tiles (null = unavailable)
  const [headcount, setHeadcount] = useState<{
    total: number;
    active: number;
    probation: number;
  } | null>(null);

  // Lifted out of DataTable so the switcher can sit in the view toolbar
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Status Modal State
  const [statusModalTarget, setStatusModalTarget] = useState<Employee | null>(null);

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
  }, [page, pageSize, selectedDept, selectedDesig, selectedType, selectedStatus, toast]);

  /*
   * Headline counts come from the server's own totals (pageSize=1, read meta),
   * not from the current page — a page-local tally would under-report badly on
   * any multi-page result. There is no employee stats endpoint to call instead.
   */
  const fetchHeadlineCounts = useCallback(async () => {
    const scope = {
      departmentId: selectedDept !== 'ALL' ? selectedDept : undefined,
      designationId: selectedDesig !== 'ALL' ? selectedDesig : undefined,
      employmentType: selectedType !== 'ALL' ? selectedType : undefined,
      pageSize: 1,
      page: 1,
    };

    try {
      const [all, active, probation] = await Promise.all([
        employeesApi.getEmployees(scope),
        employeesApi.getEmployees({ ...scope, status: 'ACTIVE' }),
        employeesApi.getEmployees({ ...scope, status: 'PROBATION' }),
      ]);

      setHeadcount({
        total: all.meta?.totalItems ?? 0,
        active: active.meta?.totalItems ?? 0,
        probation: probation.meta?.totalItems ?? 0,
      });
    } catch {
      setHeadcount(null); // Tiles fall back to "—" rather than showing a stale figure
    }
  }, [selectedDept, selectedDesig, selectedType]);

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

  useEffect(() => {
    fetchHeadlineCounts();
  }, [fetchHeadlineCounts]);

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
  const renderCard = (employee: Employee) => (
    <div className="flex flex-col justify-between rounded-md border border-hairline bg-surface p-5 transition-colors hover:bg-surface-2">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={employee.avatarUrl}
              name={employee.displayName || `${employee.firstName} ${employee.lastName}`}
              size="md"
            />
            <div>
              <h4
                onClick={() => navigate(`/employees/${employee._id}`)}
                className="text-sm font-bold text-slate-900 hover:text-[#524b6e] cursor-pointer transition-colors dark:text-slate-100 dark:hover:text-indigo-400"
              >
                {employee.displayName || `${employee.firstName} ${employee.lastName}`}
              </h4>
              <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {employee.employeeCode}
              </p>
            </div>
          </div>
          {getStatusBadge(employee.status)}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-900">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold truncate">{employee.designationTitle || 'Staff Member'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{employee.departmentName || 'General Operations'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{employee.workEmail}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Joined: {new Date(employee.joiningDate).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/employees/${employee._id}`)}
            className="text-xs h-7 px-2.5"
          >
            Profile
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/employees/${employee._id}/edit`)}
            className="text-xs h-7 px-2"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-2.5">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[15px] font-semibold leading-tight tracking-tight text-ink">
            Employee Directory
          </h1>
          <p className="mt-0.5 text-[11px] leading-tight text-ink-3">
            Master roster of all corporate personnel, reporting hierarchy, and team assignments.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/employees/new')}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add Employee</span>
        </Button>
      </div>

      {/* Headline counts — server totals, scoped to the active filters */}
      <StatTileRow>
        <StatTile
          label="Headcount"
          value={headcount ? headcount.total.toLocaleString() : '—'}
          unit="Employees"
          swatch="bg-indigo-500"
        />
        <StatTile
          label="Active"
          value={headcount ? headcount.active.toLocaleString() : '—'}
          unit="Employees"
          swatch="bg-emerald-500"
        />
        <StatTile
          label="On Probation"
          value={headcount ? headcount.probation.toLocaleString() : '—'}
          unit="Employees"
          swatch="bg-amber-500"
        />
        <StatTile
          label="Departments"
          value={departments.length.toLocaleString()}
          unit="Active units"
          swatch="bg-violet-500"
        />
      </StatTileRow>

      {/* View switcher + table-scoped actions */}
      <ViewToolbar
        activeView={viewMode === 'cards' ? 'kanban' : 'table'}
        availableViews={['table', 'kanban']}
        onViewChange={(view) => setViewMode(view === 'kanban' ? 'cards' : 'table')}
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

      {/* Multi-Dimensional Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-2">
        <div className="mr-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-ink-3">
          <Filter className="h-3 w-3" />
          <span>Filters</span>
        </div>

        {/* Department Filter */}
        <div className="w-44">
          <SelectField
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
        </div>

        {/* Designation Filter */}
        <div className="w-44">
          <SelectField
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
        </div>

        {/* Employment Type Filter */}
        <div className="w-44">
          <SelectField
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
            ]}
          />
        </div>

        {/* Status Lifecycle Filter */}
        <div className="w-44">
          <SelectField
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

        {(selectedDept !== 'ALL' || selectedDesig !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSelectedDept('ALL');
              setSelectedDesig('ALL');
              setSelectedType('ALL');
              setSelectedStatus('ALL');
              setPage(1);
            }}
            className="cursor-pointer text-[11.5px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
          >
            Reset Filters
          </button>
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
    </div>
  );
}
