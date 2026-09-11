import { useState, type ComponentType } from 'react';
import { Archive, Check, Loader2, Play, Send, Share2, Trash2, Undo2, Upload } from 'lucide-react';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import { ASSIGNABLE_STATUSES, QUIZ_STATUS_LABELS, type Quiz } from '../types/quiz.types';

interface Props {
  quiz: Quiz;
  onChanged: (quiz: Quiz) => void;
  onAssign: (quiz: Quiz) => void;
  /** Called once the quiz is gone, so the list can drop it. */
  onDeleted?: (quizId: string) => void;
  /** Opens the quiz in the player. Rendered as the first action when given. */
  onPreview?: () => void;
}

/** The colour a status carries wherever it is shown. */
const STATUS_CLASSES: Record<Quiz['status'], string> = {
  DRAFT: 'bg-surface-2 text-ink-3',
  IN_REVIEW: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  PUBLISHED: 'bg-primary-light text-primary',
  ARCHIVED: 'bg-surface-2 text-ink-3 line-through',
};

export function QuizStatusBadge({ status, className }: { status: Quiz['status']; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {QUIZ_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * One action in the row.
 *
 * Square and icon-only unless it is the primary move, which keeps its label —
 * five labelled buttons will not fit across a card, and five unlabelled ones
 * leave nothing to aim at. The label is still on every button as its title and
 * its accessible name, so nothing is hidden from a screen reader or a hover.
 */
function Action({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
  tone = 'default',
  showLabel = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'default' | 'primary' | 'danger';
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40',
        showLabel ? 'px-2.5' : 'w-7',
        tone === 'primary' &&
          'border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]',
        tone === 'danger' &&
          'border-transparent text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30',
        tone === 'default' && 'border-hairline bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

/**
 * The buttons that move a quiz forward, and the ones that end it.
 *
 * Only the moves that are legal from the current state are rendered. Showing a
 * disabled Assign on a draft would invite the click and then explain the
 * refusal; showing nothing says the same thing without the dead end.
 *
 * Assign lives here rather than in the studio because it is the consequential
 * act: it puts a quiz in front of real people, and it should sit beside the
 * approval that earned the right to do so.
 */
export function QuizLifecycleActions({ quiz, onChanged, onAssign, onDeleted, onPreview }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'archive' | 'delete' | null>(null);

  const run = async (label: string, action: () => Promise<Quiz>, success: string) => {
    setBusy(label);
    try {
      onChanged(await action());
      toast.success(success);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'That did not go through.');
    } finally {
      setBusy(null);
    }
  };

  const canAssign = ASSIGNABLE_STATUSES.includes(quiz.status);

  /*
   * A published quiz is archived first, then deleted.
   *
   * Deleting something that is live in people's arenas should take two
   * decisions rather than one, and archiving is almost always the one that was
   * actually wanted.
   */
  const canArchive = quiz.status !== 'ARCHIVED';
  const canDelete = quiz.status !== 'PUBLISHED';

  const handleArchive = async () => {
    setBusy('archive');
    try {
      onChanged(await quizApi.archiveQuiz(quiz._id));
      toast.success('Archived. It is out of circulation but still here.');
      setConfirming(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not archive that quiz.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    try {
      const res = await quizApi.deleteQuiz(quiz._id);
      toast.success(
        res.attemptsKept > 0
          ? `Deleted. ${res.attemptsKept} recorded attempt${res.attemptsKept === 1 ? '' : 's'} kept, so past scores stay explainable.`
          : 'Deleted.',
      );
      setConfirming(null);
      onDeleted?.(quiz._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not delete that quiz.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex w-full items-center gap-1">
      {onPreview && <Action icon={Play} label="Preview" onClick={onPreview} disabled={!!busy} />}

      {quiz.status === 'DRAFT' && (
        <Action
          icon={Send}
          label="Send for review"
          showLabel
          tone="primary"
          disabled={!!busy}
          busy={busy === 'review'}
          onClick={() => run('review', () => quizApi.submitForReview(quiz._id), 'Sent for review.')}
        />
      )}

      {quiz.status === 'IN_REVIEW' && (
        <>
          <Action
            icon={Undo2}
            label="Send back"
            disabled={!!busy}
            busy={busy === 'reject'}
            onClick={() =>
              run('reject', () => quizApi.rejectQuiz(quiz._id, 'Needs more work.'), 'Sent back to draft.')
            }
          />
          <Action
            icon={Check}
            label="Approve"
            showLabel
            tone="primary"
            disabled={!!busy}
            busy={busy === 'approve'}
            onClick={() => run('approve', () => quizApi.approveQuiz(quiz._id), 'Approved.')}
          />
        </>
      )}

      {quiz.status === 'APPROVED' && (
        <Action
          icon={Upload}
          label="Publish"
          disabled={!!busy}
          busy={busy === 'publish'}
          onClick={() => run('publish', () => quizApi.publishQuiz(quiz._id), 'Published to the arena.')}
        />
      )}

      {canAssign && (
        <Action
          icon={Share2}
          label="Assign"
          showLabel
          tone="primary"
          disabled={!!busy}
          onClick={() => onAssign(quiz)}
        />
      )}

      {/* Ending actions sit apart from the ones that move a quiz forward, so
          Delete is never the button next to the one you meant to press. */}
      <span className="ml-auto flex items-center gap-1">
        {canArchive && (
          <Action
            icon={Archive}
            label="Archive"
            disabled={!!busy}
            onClick={() => setConfirming('archive')}
          />
        )}

        {canDelete && (
          <Action
            icon={Trash2}
            label="Delete"
            tone="danger"
            disabled={!!busy}
            onClick={() => setConfirming('delete')}
          />
        )}
      </span>

      <ConfirmDialog
        isOpen={confirming === 'archive'}
        title={`Archive "${quiz.title}"?`}
        description="It stops being assignable and disappears from people's arenas. Nothing is lost — you can move it back to draft later."
        confirmText="Archive it"
        confirmVariant="primary"
        isLoading={busy === 'archive'}
        onConfirm={handleArchive}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        isOpen={confirming === 'delete'}
        title={`Delete "${quiz.title}"?`}
        description="The quiz and its assignments go for good. Attempts people have already sat are kept, so their scores stay explainable."
        confirmText="Delete it"
        confirmVariant="danger"
        isLoading={busy === 'delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
