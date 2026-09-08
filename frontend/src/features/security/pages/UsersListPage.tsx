import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  Unlock,
  Power,
  Mail,
  KeyRound,
  ExternalLink,
  UserPlus,
  LogOut,
  Send,
  Ban,
  Clock,
  UserCheck,
  UserX,
  Lock,
  RotateCcw,
  X,
  Filter,
} from 'lucide-react';
import { DataTable, type Column } from '../../../components/data-table/DataTable';
import { Button, SelectField, Avatar, StatusBadge, Tooltip, SearchInput } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { AssignRoleModal } from '../components/AssignRoleModal';
import { InviteUserModal } from '../components/InviteUserModal';
import { securityApi } from '../api/security.api';
import type { UserAccount, Role, Invitation, UserMetrics } from '../types/security.types';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';

type RosterTab = 'USERS' | 'INVITATIONS';

export function UsersListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<RosterTab>('USERS');

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Filtering (Active Users)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pending Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationStatusFilter, setInvitationStatusFilter] = useState('ALL');
  const [invitePage, setInvitePage] = useState(1);
  const [invitePageSize, setInvitePageSize] = useState(10);
  const [inviteTotal, setInviteTotal] = useState(0);

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<UserAccount | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<UserAccount | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserAccount | null>(null);
  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<UserAccount | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await securityApi.getUsers({
        search: search.trim() || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        pageSize,
      });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load user accounts');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, page, pageSize, toast]);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await securityApi.getMetrics();
      setMetrics(data);
    } catch {
      setMetrics(null);
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      const res = await securityApi.getInvitations({
        status: invitationStatusFilter !== 'ALL' ? invitationStatusFilter : undefined,
        page: invitePage,
        pageSize: invitePageSize,
      });
      setInvitations(res.data || []);
      setInviteTotal(res.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load pending invitations');
    } finally {
      setInvitationsLoading(false);
    }
  }, [invitationStatusFilter, invitePage, invitePageSize, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time synchronization when profile picture changes in My Profile
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      const newAvatar = e?.detail?.avatarUrl;
      if (newAvatar) {
        setUsers(prev => prev.map(u => {
          const isSelf = (user?.id && u._id === user.id) || 
                         ((user as any)?._id && u._id === (user as any)._id) || 
                         (user?.email && u.email?.toLowerCase() === user.email.toLowerCase());
          return isSelf ? { ...u, avatarUrl: newAvatar } : u;
        }));
      }
      fetchUsers();
    };

    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user_profile_updated', handleProfileUpdate);
    };
  }, [fetchUsers, user]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (activeTab === 'INVITATIONS') {
      fetchInvitations();
    }
  }, [activeTab, fetchInvitations]);

  useEffect(() => {
    async function loadRoles() {
      try {
        const data = await securityApi.getRoles();
        setRoles(Array.isArray(data) ? data : []);
      } catch {
        setRoles([]);
      }
    }
    loadRoles();
  }, []);

  const refreshAll = () => {
    fetchUsers();
    fetchMetrics();
    if (activeTab === 'INVITATIONS') fetchInvitations();
  };

  const handleAssignRolesSave = async (
    userId: string,
    selectedRoles: string[],
    departmentScope: string[],
  ) => {
    try {
      await securityApi.assignRoles(userId, selectedRoles, departmentScope);
      toast.success('Roles assigned successfully');
      refreshAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to update roles');
    }
  };

  const handleUnlockConfirm = async () => {
    if (!unlockTarget) return;
    try {
      setActionLoading(true);
      const res = await securityApi.unlockUser(unlockTarget._id);
      toast.success(res.message);
      setUnlockTarget(null);
      refreshAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    try {
      setActionLoading(true);
      const newStatus = statusTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await securityApi.updateUserStatus(statusTarget._id, newStatus);
      toast.success(`User status changed to ${newStatus}`);
      setStatusTarget(null);
      refreshAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetTarget) return;
    try {
      setActionLoading(true);
      await securityApi.sendPasswordReset(resetTarget._id);
      toast.success(`Password reset email dispatched to ${resetTarget.email}`);
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch password reset');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateSessionsConfirm = async () => {
    if (!terminateTarget) return;
    try {
      setActionLoading(true);
      const res = await securityApi.terminateSessions(terminateTarget._id);
      toast.success(res.message);
      setTerminateTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to terminate sessions');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvite = async (payload: {
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    expiryHours: number;
  }) => {
    await securityApi.createInvitation(payload);
    toast.success(`Invitation sent to ${payload.email}`);
    refreshAll();
    setActiveTab('INVITATIONS');
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      setActionLoading(true);
      const res = await securityApi.resendInvitation(invitation._id);
      toast.success(res.message);
      fetchInvitations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to resend invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    try {
      setActionLoading(true);
      const res = await securityApi.revokeInvitation(revokeTarget._id);
      toast.success(res.message);
      setRevokeTarget(null);
      refreshAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to revoke invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const userColumns: Column<UserAccount>[] = [
    {
      header: 'User Account',
      accessorKey: 'email',
      sortable: true,
      cell: (row) => {
        const isSelf = !!user && (
          user.id === row._id || 
          (user as any)._id === row._id || 
          user.email?.toLowerCase() === row.email?.toLowerCase()
        );
        const effectiveAvatar = (isSelf && user?.avatarUrl) ? user.avatarUrl : (row.avatarUrl || row.linkedEmployee?.avatarUrl);

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={effectiveAvatar}
              name={`${row.firstName} ${row.lastName}`}
              size="sm"
              shape="rounded"
            />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {row.firstName} {row.lastName}
                {isSelf && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    You
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {row.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Linked Employee',
      cell: (row) =>
        row.linkedEmployee ? (
          <Link
            to={`/employees/${row.linkedEmployee._id}`}
            className="group flex items-center gap-2 text-xs text-slate-700 hover:text-[#524b6e] dark:text-slate-300 dark:hover:text-indigo-400 transition-colors"
          >
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950">
              {row.linkedEmployee.employeeCode}
            </span>
            <span className="font-medium">{row.linkedEmployee.displayName}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ) : (
          <span className="text-xs text-slate-400 italic">No employee profile</span>
        ),
    },
    {
      header: 'Assigned Roles',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles && row.roles.length > 0 ? (
            row.roles.map((role, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-[#524b6e] border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60"
              >
                <Shield className="h-2.5 w-2.5" />
                {role}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">Standard User</span>
          )}
        </div>
      ),
    },
    {
      header: 'Account Status',
      accessorKey: 'status',
      cell: (row) => {
        const isLocked = row.status === 'LOCKED' || (row.lockedUntil && new Date(row.lockedUntil) > new Date());
        if (isLocked) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900">
              <ShieldAlert className="h-3 w-3" />
              Locked ({row.failedLoginAttempts} failed)
            </span>
          );
        }
        return <StatusBadge status={row.status} />;
      },
    },
    {
      header: 'Last Login',
      accessorKey: 'lastLoginAt',
      cell: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never logged in'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => {
        const isLocked = row.status === 'LOCKED' || (row.lockedUntil && new Date(row.lockedUntil) > new Date()) || row.failedLoginAttempts > 0;

        return (
          <div className="flex items-center gap-1">
            <Tooltip content="Assign Roles" placement="top">
              <button
                type="button"
                onClick={() => setRoleModalUser(row)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#524b6e] transition-colors cursor-pointer dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                aria-label="Assign Roles"
              >
                <Shield className="h-3.5 w-3.5" />
              </button>
            </Tooltip>

            {isLocked && (
              <Tooltip content="Unlock Account" placement="top">
                <button
                  type="button"
                  onClick={() => setUnlockTarget(row)}
                  className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                  aria-label="Unlock Account"
                >
                  <Unlock className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}

            <Tooltip
              content={row.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
              placement="top"
            >
              <button
                type="button"
                onClick={() => setStatusTarget(row)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  row.status === 'ACTIVE'
                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
                aria-label={row.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            </Tooltip>

            <Tooltip content="Reset Password Link" placement="top">
              <button
                type="button"
                onClick={() => setResetTarget(row)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
                aria-label="Send Reset Password Link"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </button>
            </Tooltip>

            <Tooltip content="Terminate All Sessions" placement="top">
              <button
                type="button"
                onClick={() => setTerminateTarget(row)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                aria-label="Terminate All Sessions"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const invitationStatusStyles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    REVOKED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
  };

  const invitationColumns: Column<Invitation>[] = [
    {
      header: 'Invitee',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {row.firstName} {row.lastName}
          </span>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
            <Mail className="h-3 w-3" />
            {row.email}
          </span>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-[#524b6e] border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60"
            >
              <Shield className="h-2.5 w-2.5" />
              {role}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Invited By',
      cell: (row) => <span className="text-xs text-slate-600 dark:text-slate-300">{row.invitedByName || '—'}</span>,
    },
    {
      header: 'Sent',
      cell: (row) => (
        <span className="text-xs text-slate-500 font-mono">{new Date(row.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      header: 'Expires',
      cell: (row) => {
        const expired = new Date(row.expiresAt) < new Date();
        return (
          <span className={`text-xs font-mono flex items-center gap-1 ${expired ? 'text-rose-500' : 'text-slate-500'}`}>
            <Clock className="h-3 w-3" />
            {new Date(row.expiresAt).toLocaleString()}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${invitationStatusStyles[row.status] || ''}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          {(row.status === 'PENDING' || row.status === 'EXPIRED') && (
            <Tooltip content="Resend Invitation" placement="top">
              <button
                type="button"
                onClick={() => handleResendInvitation(row)}
                disabled={actionLoading}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#524b6e] transition-colors cursor-pointer dark:hover:bg-slate-800 dark:hover:text-indigo-400 disabled:opacity-50"
                aria-label="Resend Invitation"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          {row.status !== 'ACCEPTED' && row.status !== 'REVOKED' && (
            <Tooltip content="Revoke Invitation" placement="top">
              <button
                type="button"
                onClick={() => setRevokeTarget(row)}
                className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                aria-label="Revoke Invitation"
              >
                <Ban className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  const metricCards = [
    { label: 'Total Active', value: metrics?.totalActive ?? '—', icon: UserCheck, from: 'from-emerald-500', to: 'to-teal-500', ring: 'ring-emerald-500/20' },
    { label: 'Pending Invitations', value: metrics?.pendingInvitations ?? '—', icon: Send, from: 'from-amber-500', to: 'to-orange-500', ring: 'ring-amber-500/20' },
    { label: 'Suspended', value: metrics?.suspended ?? '—', icon: UserX, from: 'from-rose-500', to: 'to-pink-500', ring: 'ring-rose-500/20' },
    { label: 'Locked', value: metrics?.locked ?? '—', icon: Lock, from: 'from-red-500', to: 'to-rose-600', ring: 'ring-red-500/20' },
    { label: 'Admins & Managers', value: metrics?.activeAdminsAndManagers ?? '—', icon: Shield, from: 'from-indigo-500', to: 'to-violet-600', ring: 'ring-indigo-500/20' },
  ];

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="User Accounts & Security Roster"
        description="Manage system access accounts, role profiles, and authentication statuses."
        actions={
          <>
            <Button size="sm" onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Invite Administrative User
            </Button>
            <Link to="/security/roles">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Roles & Permissions
              </Button>
            </Link>
            <Link to="/security/settings">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Security Settings
              </Button>
            </Link>
          </>
        }
      />

      {/* Top Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ${card.ring}`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${card.from} ${card.to} text-white`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none">{card.value}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Switcher - Styled with violet theme */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'USERS'
              ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Active Users Directory</span>
          <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 text-[10px] font-bold">
            {total}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('INVITATIONS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'INVITATIONS'
              ? 'border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>Pending Invitations</span>
          {!!metrics?.pendingInvitations && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 text-[10px] font-bold">
              {metrics.pendingInvitations}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'USERS' ? (
        <>
          {/* Rich Colorful Filter Panel Card */}
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5 transition-all">
            {/* Top Quick Role Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="h-3 w-3 text-violet-500" />
                  Role:
                </span>
                {[
                  { label: 'All Accounts', value: 'ALL' },
                  { label: 'Super Admin', value: 'Super Administrator' },
                  { label: 'HR Admin', value: 'HR Administrator' },
                  { label: 'Department Manager', value: 'Department Manager' },
                ].map((pill) => {
                  const isActive = roleFilter === pill.value;
                  return (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => {
                        setRoleFilter(pill.value);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border select-none ${
                        isActive
                          ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 border border-violet-100 dark:border-violet-900/40 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span>{total.toLocaleString()} accounts in registry</span>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SearchInput
                label="Search Identity"
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                onClear={() => setPage(1)}
                placeholder="Search by name or email..."
              />

              <SelectField
                label="Role Authority"
                placeholder="All Roles"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Roles' },
                  ...(Array.isArray(roles) ? roles.map((r) => ({ value: r.name, label: r.name })) : []),
                ]}
              />

              <SelectField
                label="Authentication Status"
                placeholder="All Account Statuses"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Accounts' },
                  { value: 'SUSPENDED', label: 'Suspended Accounts' },
                  { value: 'LOCKED', label: 'Locked Accounts' },
                  { value: 'INVITED', label: 'Invited' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
              />
            </div>

            {/* Active Filter Badges */}
            {(!!search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Filters:</span>

                {search && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300">
                    Search: "{search}"
                    <X className="h-3 w-3 cursor-pointer hover:text-violet-900" onClick={() => { setSearch(''); setPage(1); }} />
                  </span>
                )}

                {roleFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                    Role: {roleFilter}
                    <X className="h-3 w-3 cursor-pointer hover:text-indigo-900" onClick={() => { setRoleFilter('ALL'); setPage(1); }} />
                  </span>
                )}

                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                    Status: {statusFilter}
                    <X className="h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => { setStatusFilter('ALL'); setPage(1); }} />
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('ALL');
                    setStatusFilter('ALL');
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset All Filters
                </button>
              </div>
            )}
          </div>

          {/* Users DataTable */}
          <DataTable
            columns={userColumns}
            data={users}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            emptyTitle="No user accounts found"
            emptyDescription="Try adjusting your search criteria or role filters."
          />
        </>
      ) : (
        <>
          {/* Invitations Filter Card */}
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-full sm:w-64">
                <SelectField
                  label="Invitation Lifecycle Status"
                  value={invitationStatusFilter}
                  onChange={(e) => {
                    setInvitationStatusFilter(e.target.value);
                    setInvitePage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Lifecycle Statuses' },
                    { value: 'PENDING', label: 'Pending (Waiting on Invitee)' },
                    { value: 'ACCEPTED', label: 'Accepted (Account Activated)' },
                    { value: 'EXPIRED', label: 'Expired (Token Invalidation)' },
                    { value: 'REVOKED', label: 'Revoked by Administrator' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite New User
                </Button>
              </div>
            </div>

            {invitationStatusFilter !== 'ALL' && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[11px] font-semibold text-slate-400">Active Filter:</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                  Status: {invitationStatusFilter}
                  <X className="h-3 w-3 cursor-pointer hover:text-amber-900" onClick={() => { setInvitationStatusFilter('ALL'); setInvitePage(1); }} />
                </span>
                <button
                  type="button"
                  onClick={() => { setInvitationStatusFilter('ALL'); setInvitePage(1); }}
                  className="inline-flex items-center gap-1 ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          <DataTable
            columns={invitationColumns}
            data={invitations}
            isLoading={invitationsLoading}
            page={invitePage}
            pageSize={invitePageSize}
            totalItems={inviteTotal}
            onPageChange={setInvitePage}
            onPageSizeChange={(s) => {
              setInvitePageSize(s);
              setInvitePage(1);
            }}
            emptyTitle="No invitations found"
            emptyDescription="Invite an administrator, HR manager, or department lead to get started."
          />
        </>
      )}

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        availableRoles={roles}
        onInvite={handleInvite}
      />

      {/* Assign Role Modal */}
      <AssignRoleModal
        isOpen={!!roleModalUser}
        onClose={() => setRoleModalUser(null)}
        user={roleModalUser}
        availableRoles={roles}
        onSave={handleAssignRolesSave}
      />

      {/* Unlock Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!unlockTarget}
        title="Unlock User Account"
        description={`Are you sure you want to unlock ${unlockTarget?.firstName} ${unlockTarget?.lastName}'s account (${unlockTarget?.email})? This will reset failed login attempts and restore login privileges immediately.`}
        confirmLabel="Unlock Account"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={handleUnlockConfirm}
        onCancel={() => setUnlockTarget(null)}
      />

      {/* Suspend / Activate Dialog */}
      <ConfirmDialog
        isOpen={!!statusTarget}
        title={statusTarget?.status === 'ACTIVE' ? 'Suspend User Account' : 'Activate User Account'}
        description={
          statusTarget?.status === 'ACTIVE'
            ? `Suspending ${statusTarget?.email} will immediately invalidate all active sessions and prevent further system login until reactivated.`
            : `Reactivating ${statusTarget?.email} will restore standard access privileges.`
        }
        confirmLabel={statusTarget?.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
        variant={statusTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        isLoading={actionLoading}
        onConfirm={handleStatusToggle}
        onCancel={() => setStatusTarget(null)}
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!resetTarget}
        title="Send Password Reset Email"
        description={`Send a secure password reset link to ${resetTarget?.email}? The existing password will remain valid until a new password is set.`}
        confirmLabel="Send Reset Link"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={handleResetPasswordConfirm}
        onCancel={() => setResetTarget(null)}
      />

      {/* Terminate Sessions Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!terminateTarget}
        title="Terminate All Active Sessions"
        description={`This will immediately sign out ${terminateTarget?.email} from every device and browser session. They will need to sign in again.`}
        confirmLabel="Terminate Sessions"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleTerminateSessionsConfirm}
        onCancel={() => setTerminateTarget(null)}
      />

      {/* Revoke Invitation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        title="Revoke Invitation"
        description={`Revoke the pending invitation for ${revokeTarget?.email}? The invitation link will stop working immediately.`}
        confirmLabel="Revoke Invitation"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
