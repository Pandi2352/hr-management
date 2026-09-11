import { useCallback, useEffect, useState } from 'react';
import {
  Laptop,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Smartphone,
  Tablet,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { authApi, type ActiveSession } from '../api/auth.api';

const DEVICE_ICONS = {
  Desktop: Laptop,
  Mobile: Smartphone,
  Tablet: Tablet,
  Unknown: HelpCircle,
} as const;

/**
 * How long ago, in the words a person would use.
 *
 * "2 hours ago" answers "is that me?" in a way a timestamp does not — nobody
 * reading a security screen wants to subtract dates to work out whether they
 * were at their desk then.
 */
function timeAgo(value: string | null): string {
  if (!value) return 'unknown';

  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(value).toLocaleDateString();
}

/**
 * Where you are signed in.
 *
 * The session records have always existed; nothing ever showed them to the
 * person they belong to. That matters because ending a session somebody does
 * not recognise is the single most useful thing an account owner can do
 * without involving an administrator.
 */
export function ActiveSessionsPanel() {
  const toast = useToast();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ActiveSession | 'others' | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setSessions(await authApi.listSessions());
    } catch {
      toast.error('Could not load your active sessions.');
    } finally {
      setIsLoading(false);
    }
    // The toast helper is stable for the life of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (session: ActiveSession) => {
    setBusyId(session.id);
    try {
      await authApi.revokeSession(session.id);
      toast.success(`${session.deviceLabel} has been signed out.`);
      setConfirming(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not sign that device out.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setBusyId('others');
    try {
      const res = await authApi.revokeOtherSessions();
      toast.success(
        res.revoked === 0
          ? 'No other devices were signed in.'
          : `Signed out ${res.revoked} other device${res.revoked === 1 ? '' : 's'}.`,
      );
      setConfirming(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not sign the other devices out.');
    } finally {
      setBusyId(null);
    }
  };

  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="rounded-md border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Where you are signed in</h3>
          <p className="mt-0.5 text-xs text-ink-3">
            Every device with a live session on your account. Sign out anything you do not
            recognise, then change your password.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>

          {others.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirming('others')}
              disabled={busyId !== null}
              className="gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out {others.length} other{others.length === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      </div>

      {isLoading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-xs text-ink-3">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking your devices…
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-10 text-center text-xs text-ink-3">No active sessions found.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-md border border-hairline">
          {sessions.map((session, i) => {
            const Icon = DEVICE_ICONS[session.deviceType] || HelpCircle;

            return (
              <div
                key={session.id}
                className={cn(
                  'flex flex-wrap items-center gap-3 px-4 py-3.5',
                  i > 0 && 'border-t border-hairline',
                  session.isCurrent && 'bg-surface-2/50',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface text-ink-2">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{session.deviceLabel}</p>
                    {session.isCurrent && (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        This device
                      </span>
                    )}
                    {session.rememberMe && (
                      <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                        Stays signed in
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {session.location}
                    </span>
                    <span>Last used {timeAgo(session.lastUsedAt)}</span>
                    <span>Signed in {timeAgo(session.signedInAt)}</span>
                  </p>
                </div>

                {/* The current device has no button. Ending your own session
                    from a list of devices is almost always a misread row, and
                    "sign out" already exists elsewhere for when it is not. */}
                {!session.isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirming(session)}
                    disabled={busyId !== null}
                    className="gap-1.5 text-[11px]"
                  >
                    {busyId === session.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    Sign out
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Said plainly, because a screen that shows an IP address invites the
          question, and a guessed city would be worse than none. */}
      <p className="mt-3 text-[10.5px] text-ink-3">
        Locations show where the connection came from, not a physical address. A session ends
        automatically when it expires, and signing a device out takes effect immediately.
      </p>

      <ConfirmDialog
        isOpen={confirming !== null && confirming !== 'others'}
        title={
          confirming && confirming !== 'others'
            ? `Sign out ${confirming.deviceLabel}?`
            : 'Sign out this device?'
        }
        description="That device will have to sign in again. If you do not recognise it, change your password straight afterwards."
        confirmText="Sign it out"
        confirmVariant="danger"
        isLoading={busyId !== null && busyId !== 'others'}
        onConfirm={() => confirming && confirming !== 'others' && handleRevoke(confirming)}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        isOpen={confirming === 'others'}
        title={`Sign out ${others.length} other device${others.length === 1 ? '' : 's'}?`}
        description="You will stay signed in here. Every other device will have to sign in again."
        confirmText="Sign them out"
        confirmVariant="danger"
        isLoading={busyId === 'others'}
        onConfirm={handleRevokeOthers}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
