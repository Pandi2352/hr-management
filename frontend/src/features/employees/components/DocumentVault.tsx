import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button, Input, Modal, SelectField, useToast } from '../../../components/ui';
import { employeesApi } from '../api/employees.api';
import {
  ACCEPTED_DOCUMENT_TYPES,
  DOCUMENT_CATEGORY_LABELS,
  MAX_DOCUMENT_BYTES,
  type DocumentItem,
} from '../types/employees.types';

const CATEGORY_OPTIONS = Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATUS_STYLES: Record<string, { label: string; className: string; Icon: typeof Clock3 }> = {
  VERIFIED: {
    label: 'Verified',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    Icon: CheckCircle2,
  },
  PENDING: {
    label: 'Awaiting review',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    Icon: Clock3,
  },
  REJECTED: {
    label: 'Rejected',
    className:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900',
    Icon: XCircle,
  },
};

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface DocumentVaultProps {
  employeeId: string;
  documents: DocumentItem[];
  /** Lets the parent page keep its cached employee object in sync. */
  onChange: (documents: DocumentItem[]) => void;
  canManage?: boolean;
}

export function DocumentVault({
  employeeId,
  documents,
  onChange,
  canManage = true,
}: DocumentVaultProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [progress, setProgress] = useState<number | null>(null);

  const [preview, setPreview] = useState<{ doc: DocumentItem; url: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [rejecting, setRejecting] = useState<DocumentItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return documents.reduce(
      (acc, doc) => {
        const key = doc.verificationStatus || 'PENDING';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { VERIFIED: 0, PENDING: 0, REJECTED: 0 } as Record<string, number>
    );
  }, [documents]);

  // Object URLs are a finite resource; release the previous one on every swap.
  useEffect(() => {
    return () => {
      if (preview) window.URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPTED_DOCUMENT_TYPES.split(',').includes(file.type)) {
        toast.error('Only PDF, PNG and JPG files can be stored in the vault.', 'Unsupported file');
        return;
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        toast.error('Files must be 10 MB or smaller.', 'File too large');
        return;
      }
      setPendingFile(file);
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''));
    },
    [toast]
  );

  const handleUpload = async () => {
    if (!pendingFile || !title.trim()) return;
    setProgress(0);
    try {
      const created = await employeesApi.uploadDocument(
        employeeId,
        pendingFile,
        { title: title.trim(), category },
        setProgress
      );
      onChange([...documents, created]);
      toast.success(`"${created.title}" added to the vault.`, 'Document uploaded');
      setPendingFile(null);
      setTitle('');
      setCategory('GENERAL');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'The upload could not be completed.', 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  const openPreview = async (doc: DocumentItem) => {
    setIsPreviewLoading(true);
    try {
      const url = await employeesApi.fetchDocumentBlobUrl(employeeId, doc.id!);
      setPreview({ doc, url });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'The file could not be opened.', 'Preview failed');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const applyReview = async (doc: DocumentItem, status: 'VERIFIED' | 'REJECTED', note?: string) => {
    setBusyId(doc.id!);
    try {
      const updated = await employeesApi.reviewDocument(employeeId, doc.id!, { status, note });
      onChange(documents.map((d) => (d.id === doc.id ? updated : d)));
      toast.success(
        status === 'VERIFIED' ? `"${doc.title}" marked verified.` : `"${doc.title}" sent back for re-upload.`,
        'Review recorded'
      );
      setRejecting(null);
      setRejectNote('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'The review could not be saved.', 'Review failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Permanently remove "${doc.title}" from this employee's vault?`)) return;
    setBusyId(doc.id!);
    try {
      await employeesApi.deleteDocument(employeeId, doc.id!);
      onChange(documents.filter((d) => d.id !== doc.id));
      toast.success(`"${doc.title}" was removed.`, 'Document deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'The document could not be removed.', 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary strip — reads as one continuous bar, no floating cards. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-hairline bg-surface-2 px-4 py-2.5">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Document Vault
        </div>
        <div className="ml-auto flex items-center gap-5 text-[11px] text-ink-2">
          <span>
            <span className="font-semibold text-ink">{documents.length}</span> stored
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            <span className="font-semibold">{counts.VERIFIED}</span> verified
          </span>
          <span className="text-amber-600 dark:text-amber-400">
            <span className="font-semibold">{counts.PENDING}</span> awaiting review
          </span>
          <span className="text-rose-600 dark:text-rose-400">
            <span className="font-semibold">{counts.REJECTED}</span> rejected
          </span>
        </div>
      </div>

      {canManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-md border border-dashed px-4 py-6 transition-colors ${
            isDragging ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/20' : 'border-hairline bg-surface'
          }`}
        >
          {!pendingFile ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-5 w-5 text-ink-3" />
              <p className="text-xs text-ink-2">
                Drop a file here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-semibold text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  browse
                </button>
              </p>
              <p className="text-[10px] text-ink-3">PDF, PNG or JPG · up to 10 MB</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-ink-3" />
                  <span className="truncate text-xs font-medium text-ink">{pendingFile.name}</span>
                  <span className="shrink-0 text-[10px] text-ink-3">{formatBytes(pendingFile.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-[11px] text-ink-3 hover:text-ink"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                <Input
                  label="Document title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Signed offer letter"
                />
                <SelectField
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={CATEGORY_OPTIONS}
                />
                <Button
                  onClick={handleUpload}
                  disabled={!title.trim() || progress !== null}
                  isLoading={progress !== null}
                >
                  {progress !== null ? `${progress}%` : 'Upload'}
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_DOCUMENT_TYPES}
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </div>
      )}

      {documents.length === 0 ? (
        <p className="rounded-md border border-hairline bg-surface px-4 py-8 text-center text-xs text-ink-3">
          No identity, employment or educational records have been uploaded yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-hairline">
          {documents.map((doc, idx) => {
            const status = STATUS_STYLES[doc.verificationStatus || 'PENDING'];
            const isImage = doc.mimeType?.startsWith('image/');
            return (
              <div
                key={doc.id || idx}
                className={`flex flex-wrap items-center gap-3 bg-surface px-4 py-3 ${
                  idx > 0 ? 'border-t border-hairline' : ''
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-2">
                  {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-ink">{doc.title}</span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${status.className}`}
                    >
                      <status.Icon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-ink-3">
                    {DOCUMENT_CATEGORY_LABELS[doc.category || 'GENERAL'] || doc.category} ·{' '}
                    {formatBytes(doc.sizeBytes)} · uploaded {formatDate(doc.uploadedAt)}
                  </p>
                  {doc.verificationStatus === 'REJECTED' && doc.reviewNote && (
                    <p className="mt-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                      {doc.reviewNote}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <IconAction label="Preview" onClick={() => openPreview(doc)} disabled={isPreviewLoading}>
                    <Eye className="h-3.5 w-3.5" />
                  </IconAction>
                  <IconAction
                    label="Download"
                    onClick={() => employeesApi.downloadDocument(employeeId, doc)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </IconAction>
                  {canManage && (
                    <>
                      {doc.verificationStatus !== 'VERIFIED' && (
                        <IconAction
                          label="Mark verified"
                          onClick={() => applyReview(doc, 'VERIFIED')}
                          disabled={busyId === doc.id}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </IconAction>
                      )}
                      {doc.verificationStatus !== 'REJECTED' && (
                        <IconAction
                          label="Reject"
                          onClick={() => {
                            setRejecting(doc);
                            setRejectNote('');
                          }}
                          disabled={busyId === doc.id}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </IconAction>
                      )}
                      <IconAction
                        label="Delete"
                        onClick={() => handleDelete(doc)}
                        disabled={busyId === doc.id}
                        danger
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconAction>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.doc.title}
        className="max-w-3xl"
      >
        {preview && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md border border-hairline bg-surface-3">
              {preview.doc.mimeType?.startsWith('image/') ? (
                <img src={preview.url} alt={preview.doc.title} className="mx-auto max-h-[70vh]" />
              ) : (
                <iframe
                  src={preview.url}
                  title={preview.doc.title}
                  className="h-[70vh] w-full border-0"
                />
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-3">
              <span>
                {preview.doc.fileName} · {formatBytes(preview.doc.sizeBytes)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => employeesApi.downloadDocument(employeeId, preview.doc)}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject document"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-2">
            The reason is stored on the record and in the audit trail, so the employee knows exactly
            what to re-upload.
          </p>
          <Input
            label="Reason for rejection"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Scan is cropped — the address is not readable"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!rejectNote.trim()}
              isLoading={busyId === rejecting?.id}
              onClick={() => rejecting && applyReview(rejecting, 'REJECTED', rejectNote.trim())}
            >
              Reject document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-hairline bg-surface-2 transition-colors disabled:opacity-40 ${
        danger
          ? 'text-ink-3 hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-900 dark:hover:text-rose-400'
          : 'text-ink-3 hover:bg-surface-3 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
