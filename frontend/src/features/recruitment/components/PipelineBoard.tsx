import { Avatar } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import { PIPELINE_STAGES, type PipelineApplication } from '../types/pipeline.types';

/** Kanban-style funnel: one column per stage, cards open the detail drawer. */
export function PipelineBoard({
  applications,
  onSelect,
}: {
  applications: PipelineApplication[];
  onSelect: (app: PipelineApplication) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {PIPELINE_STAGES.map((stage) => {
        const items = applications.filter((a) => a.status === stage.id);
        return (
          <div key={stage.id} className="flex min-h-40 flex-col rounded-md border border-hairline bg-surface-2/50">
            <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', stage.tint)} />
              <p className="truncate text-[11px] font-bold tracking-wide text-ink-2 uppercase">{stage.label}</p>
              <span className="ml-auto rounded bg-surface-3 px-1.5 text-[10px] font-bold text-ink-3 tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto px-2 pb-2">
              {items.slice(0, 12).map((a) => (
                <button
                  key={a._id}
                  type="button"
                  onClick={() => onSelect(a)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-hairline bg-surface p-2 text-left transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
                >
                  <Avatar name={a.fullName} size="xs" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold">{a.fullName}</span>
                    <span className="block truncate text-[10.5px] text-ink-3">{a.jobTitle}</span>
                  </span>
                </button>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-3 text-center text-[11px] text-ink-3">No candidates</p>
              )}
              {items.length > 12 && (
                <p className="px-1 pb-1 text-center text-[10px] font-semibold text-ink-3">
                  +{items.length - 12} more
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
