import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { employeesApi } from "../api/employees.api";
import { useAuth } from "../../auth/context/AuthContext";

/**
 * Self-service resolvers: turn "my employee file" into the full
 * EmployeeDetail / EmployeeEdit pages so employees get the complete
 * detail + edit experience without needing to know their record id.
 */
function useMyEmployeeId() {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(
    user?.linkedEmployeeId || null,
  );
  const [isLoading, setIsLoading] = useState(!employeeId);
  const [hasRecord, setHasRecord] = useState<boolean>(!!employeeId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Trust the login payload when present; otherwise resolve via /employees/me.
    if (employeeId) {
      setIsLoading(false);
      setHasRecord(true);
      return () => {
        active = false;
      };
    }
    (async () => {
      try {
        const emp = await employeesApi.getMyProfile();
        if (!active) return;
        if (emp && (emp as any)._id) {
          setEmployeeId((emp as any)._id);
          setHasRecord(true);
        } else {
          setHasRecord(false);
        }
      } catch (err: any) {
        if (!active) return;
        const status = err?.response?.status;
        if (status === 404) {
          setHasRecord(false);
        } else {
          setError(
            err?.response?.data?.message ||
              "Could not load your employee file.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [employeeId]);

  return { employeeId, isLoading, hasRecord, error };
}

function ResolverShell({
  title,
  employeeId,
  isLoading,
  hasRecord,
  error,
  edit,
}: {
  title: string;
  employeeId: string | null;
  isLoading: boolean;
  hasRecord: boolean;
  error: string | null;
  edit: boolean;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && employeeId) {
      navigate(
        edit ? `/employees/${employeeId}/edit` : `/employees/${employeeId}`,
        { replace: true },
      );
    }
  }, [isLoading, employeeId, edit, navigate]);

  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto h-6 w-36 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
        <p className="mt-3 text-xs text-slate-500">{title}…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800/60 dark:bg-rose-950/30">
        <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
          {error}
        </p>
        <Link
          to="/"
          className="mt-3 inline-block text-xs font-semibold text-rose-700 underline dark:text-rose-300"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!hasRecord || !employeeId) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800/60 dark:bg-amber-950/30">
        <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
          No employee file is linked to this login yet
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-amber-700 dark:text-amber-300">
          Your account works for sign-in, but HR has not linked an employee
          record to it. Update your user profile or ask HR to create/link your
          employee file.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Link
            to="/profile"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Go to My Profile
          </Link>
          <Link
            to="/"
            className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto h-6 w-36 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      <p className="mt-3 text-xs text-slate-500">Opening your employee file…</p>
    </div>
  );
}

export function MyEmployeeDetailPage() {
  const { employeeId, isLoading, hasRecord, error } = useMyEmployeeId();
  return (
    <ResolverShell
      title="Loading your employee file"
      employeeId={employeeId}
      isLoading={isLoading}
      hasRecord={hasRecord}
      error={error}
      edit={false}
    />
  );
}

export function MyEmployeeEditPage() {
  const { employeeId, isLoading, hasRecord, error } = useMyEmployeeId();
  return (
    <ResolverShell
      title="Loading your employee editor"
      employeeId={employeeId}
      isLoading={isLoading}
      hasRecord={hasRecord}
      error={error}
      edit
    />
  );
}
