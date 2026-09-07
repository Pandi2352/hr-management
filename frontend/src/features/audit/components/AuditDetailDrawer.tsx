import { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../utils/cn';
import { Spinner } from '../../../components/ui/Spinner';
import { auditApi } from '../api/audit.api';
import { AuditDiffViewer } from './AuditDiffViewer';
import {
  auditActionTone,
  humanizeAction,
  humanizeResource,
  type AuditLog,
  type AuditVocabulary,
} from '../types/audit.types';

interface AuditDetailDrawerProps {
  auditId: string | null;
  vocabulary?: AuditVocabulary;
  onClose: () => void;
}

function CopyableField({ label, value }: { label: string; value?: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return (
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</p>
        <p className="mt-0.5 text-[12px] text-ink-3">—</p>
      </div>
    );
  }

  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="group min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</p>
      <button
        type="button"
        onClick={copy}
        title="Copy"
        className="mt-0.5 flex w-full cursor-pointer items-center gap-1.5 text-left"
      >
        <span className="truncate font-mono text-[11.5px] text-ink-2">{value}</span>
        {copied ? (
          <Check className="h-3 w-3 shrink-0 text-emerald-500" />
        ) : (
          <Copy className="h-3 w-3 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    </div>
  );
}

/** Deep-link to the underlying record where a route exists for that resource. */
function resourceHref(log: AuditLog): string | null {
  if (!log.resourceId) return null;
  switch (log.resourceType) {
    case 'EMPLOYEE':
      return `/employees/${log.resourceId}`;
    case 'ROLE':
      return `/security/roles/${log.resourceId}`;
    case 'USER':
      return '/security/users';
    case 'DEPARTMENT':
      return '/organization/departments';
    case 'DESIGNATION':
      return '/organization/designations';
    case 'LOCATION':
      return '/organization/locations';
    case 'COST_CENTER':
      return '/organization/cost-centers';
    case 'SECURITY_POLICY':
      return '/security/settings';
    default:
      return null;
  }
}

export function AuditDetailDrawer({ auditId, vocabulary, onClose }: AuditDetailDrawerProps) {
  const [log, setLog] = useState<AuditLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auditId) {
      setLog(null);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    auditApi
      .getLogById(auditId)
      .then((data) => active && setLog(data))
      .catch((err) =>
        active
          ? setError(err?.response?.data?.message || 'Unable to load this audit record.')
          : undefined,
      )
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [auditId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (auditId) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [auditId, onClose]);

  if (!auditId) return null;

  const tone = log ? auditActionTone(log.action) : null;
  const href = log ? resourceHref(log) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-hairline bg-surface">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-ink">Audit Event</h2>
            <p className="mt-0.5 truncate text-[11px] text-ink-3">
              {log ? log.description || humanizeAction(log.action, vocabulary?.actions) : 'Loading…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Spinner size="lg" variant="violet" />
              <p className="text-[11px] text-ink-3">Loading audit record…</p>
            </div>
          ) : error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-4 text-center text-[11.5px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
              {error}
            </div>
          ) : log ? (
            <div className="space-y-5">
              {/* Action summary */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-semibold',
                    tone?.chip,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', tone?.dot)} />
                  {humanizeAction(log.action, vocabulary?.actions)}
                </span>

                <span className="rounded-md bg-surface-2 px-2 py-1 text-[11.5px] font-medium text-ink-2">
                  {humanizeResource(log.resourceType, vocabulary?.resources)}
                </span>

                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold',
                    log.status === 'SUCCESS'
                      ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                      : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50',
                  )}
                >
                  {log.status === 'SUCCESS' ? (
                    <ShieldCheck className="h-3 w-3" />
                  ) : (
                    <ShieldAlert className="h-3 w-3" />
                  )}
                  {log.status}
                </span>

                {href && (
                  <Link
                    to={href}
                    onClick={onClose}
                    className="ml-auto inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    Open resource
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {/* Actor & context */}
              <section className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-hairline bg-surface-2 p-3">
                <div className="col-span-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">Actor</p>
                  <p className="mt-0.5 truncate text-[12px] font-medium text-ink">
                    {log.actorName || log.actorEmail || 'System'}
                    {log.actorType !== 'USER' && (
                      <span className="ml-1.5 rounded bg-surface-3 px-1 py-px text-[9.5px] font-semibold uppercase text-ink-3">
                        {log.actorType}
                      </span>
                    )}
                  </p>
                  {log.actorEmail && (
                    <p className="truncate text-[11px] text-ink-3">{log.actorEmail}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    Timestamp
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-2">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">Device</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-2">{log.deviceType || '—'}</p>
                </div>

                <CopyableField label="IP Address" value={log.ipAddress} />
                <CopyableField label="Audit ID" value={log._id} />
                <CopyableField label="Request ID" value={log.requestId} />
                <CopyableField label="Resource ID" value={log.resourceId} />
              </section>

              {/* Changes */}
              <section>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Changes
                </h3>
                <AuditDiffViewer oldValue={log.oldValue} newValue={log.newValue} />
              </section>

              {/* Metadata */}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    Metadata
                  </h3>
                  <pre className="custom-scrollbar max-h-56 overflow-auto rounded-md border border-hairline bg-surface-2 p-2.5 text-[11px] leading-relaxed text-ink-2">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </section>
              )}

              {log.userAgent && (
                <section>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    User Agent
                  </h3>
                  <p className="break-words rounded-md border border-hairline bg-surface-2 p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-3">
                    {log.userAgent}
                  </p>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
