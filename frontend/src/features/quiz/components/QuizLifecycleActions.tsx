import { useState } from 'react';
import { Archive, Check, Loader2, Send, Share2, Trash2, Undo2, Upload } from 'lucide-react';
import { Button } from '../../../components/ui';
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
 * The buttons that move a quiz forward, and the one that assigns it.
 *
 * Only the moves that are legal from the current state are rendered. Showing a
 * disabled Assign on a draft would invite the click and then explain the
 * refusal; showing nothing says the same thing without the dead end.
 *
 * Assign lives here rather than in the studio because it is the consequential
 * act: it puts a quiz in front of real people, and it should sit beside the
 * approval that earned the right to do so.
 */
export function QuizLifecycleActions({ quiz, onChanged, onAssign, onDeleted }: Props) {
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

  const spinner = (label: string) =>
    busy === label ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null;

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
    <div className="flex flex-wrap items-center gap-1.5">
      {quiz.status === 'DRAFT' && (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => run('review', () => quizApi.submitForReview(quiz._id), 'Sent for review.')}
          className="gap-1.5 text-[11px]"
        >
          {spinner('review') || <Send className="h-3.5 w-3.5" />}
          Send for review
        </Button>
      )}

      {quiz.status === 'IN_REVIEW' && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={() =>
              run('reject', () => quizApi.rejectQuiz(quiz._id, 'Needs more work.'), 'Sent back to draft.')
            }
            className="gap-1.5 text-[11px]"
          >
            {spinner('reject') || <Undo2 className="h-3.5 w-3.5" />}
            Send back
          </Button>

          <Button
            size="sm"
            disabled={!!busy}
            onClick={() => run('approve', () => quizApi.approveQuiz(quiz._id), 'Approved.')}
            className="gap-1.5 text-[11px]"
          >
            {spinner('approve') || <Check className="h-3.5 w-3.5" />}
            Approve
          </Button>
        </>
      )}

      {quiz.status === 'APPROVED' && (
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => run('publish', () => quizApi.publishQuiz(quiz._id), 'Published to the arena.')}
          className="gap-1.5 text-[11px]"
        >
          {spinner('publish') || <Upload className="h-3.5 w-3.5" />}
          Publish
        </Button>
      )}

      {canAssign && (
        <Button size="sm" onClick={() => onAssign(quiz)} className="gap-1.5 text-[11px]">
          <Share2 className="h-3.5 w-3.5" />
          Assign
        </Button>
      )}

      {/* A draft has nothing to assign yet, so it says why rather than
          offering a button that would be refused. */}
      {!canAssign && quiz.status !== 'IN_REVIEW' && quiz.status !== 'DRAFT' && quiz.status !== 'ARCHIVED' && (
        <span className="text-[10.5px] text-ink-3">Not assignable while {QUIZ_STATUS_LABELS[quiz.status].toLowerCase()}</span>
      )}

      {canArchive && (
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          onClick={() => setConfirming('archive')}
          title="Take it out of circulation, keeping the record"
          className="gap-1.5 text-[11px]"
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </Button>
      )}

      {canDelete && (
        <Button
          size="sm"
          variant="ghost"
          disabled={!!busy}
          onClick={() => setConfirming('delete')}
          title="Delete this quiz"
          className="gap-1.5 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      )}

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
