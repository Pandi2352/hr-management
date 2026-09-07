import { useState } from 'react';
import { ArrowRight, Braces, Rows3 } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface AuditDiffViewerProps {
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
}

type ChangeKind = 'added' | 'removed' | 'modified';

interface FieldChange {
  field: string;
  kind: ChangeKind;
  before: any;
  after: any;
}

const KIND_STYLES: Record<ChangeKind, { label: string; chip: string }> = {
  added: {
    label: 'Added',
    chip: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50',
  },
  removed: {
    label: 'Removed',
    chip: 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50',
  },
  modified: {
    label: 'Changed',
    chip: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50',
  },
};

/** `departmentId` → `Department Id` */
function humanizeField(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}

function formatValue(value: any): string {
  if (isEmpty(value)) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function buildChanges(
  oldValue: Record<string, any> | null,
  newValue: Record<string, any> | null,
): FieldChange[] {
  const keys = new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]);

  return Array.from(keys)
    .map((field) => {
      const before = oldValue?.[field];
      const after = newValue?.[field];
      const kind: ChangeKind = isEmpty(before) && !isEmpty(after)
        ? 'added'
        : !isEmpty(before) && isEmpty(after)
          ? 'removed'
          : 'modified';
      return { field, kind, before, after };
    })
    .sort((a, b) => a.field.localeCompare(b.field));
}

/**
 * Side-by-side change viewer (checklist §15) with a raw-JSON escape hatch for
 * nested payloads the human view can't render meaningfully.
 */
export function AuditDiffViewer({ oldValue, newValue }: AuditDiffViewerProps) {
  const [mode, setMode] = useState<'human' | 'json'>('human');
  const changes = buildChanges(oldValue, newValue);

  if (changes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-hairline bg-surface-2 px-3 py-4 text-center text-[11.5px] text-ink-3">
        This event recorded no field-level changes.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {changes.length} field{changes.length === 1 ? '' : 's'} changed
        </span>

        <div className="inline-flex rounded-md border border-hairline bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => setMode('human')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-colors',
              mode === 'human' ? 'bg-surface text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            <Rows3 className="h-3 w-3" />
            Fields
          </button>
          <button
            type="button"
            onClick={() => setMode('json')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-colors',
              mode === 'json' ? 'bg-surface text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            <Braces className="h-3 w-3" />
            JSON
          </button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">Before</p>
            <pre className="custom-scrollbar max-h-64 overflow-auto rounded-md border border-hairline bg-surface-2 p-2 text-[11px] leading-relaxed text-ink-2">
              {JSON.stringify(oldValue ?? {}, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">After</p>
            <pre className="custom-scrollbar max-h-64 overflow-auto rounded-md border border-hairline bg-surface-2 p-2 text-[11px] leading-relaxed text-ink-2">
              {JSON.stringify(newValue ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-hairline overflow-hidden rounded-md border border-hairline">
          {changes.map((change) => {
            const style = KIND_STYLES[change.kind];
            return (
              <div key={change.field} className="bg-surface px-3 py-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold text-ink">
                    {humanizeField(change.field)}
                  </span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide',
                      style.chip,
                    )}
                  >
                    {style.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[1fr_auto_1fr]">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-hairline bg-surface-2 px-2 py-1.5 text-[11px] text-ink-3 line-through decoration-ink-3/40">
                    {formatValue(change.before)}
                  </pre>
                  <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-ink-3 sm:block" />
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-hairline bg-surface-2 px-2 py-1.5 text-[11px] font-medium text-ink">
                    {formatValue(change.after)}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
