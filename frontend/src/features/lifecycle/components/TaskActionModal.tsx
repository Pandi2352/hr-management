import { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { OnboardingTask, TaskStatus } from '../types/onboarding.types';

interface Props {
  task: OnboardingTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, status: TaskStatus, remarks: string) => Promise<void>;
}

export function TaskActionModal({ task, isOpen, onClose, onSubmit }: Props) {
  if (!isOpen || !task) return null;

  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(task.status);
  const [remarks, setRemarks] = useState(task.remarks || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSubmit(task.id, selectedStatus, remarks);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400">
                {task.category} TASK
              </span>
              {task.isMandatory && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded-md">
                  Mandatory Gate
                </span>
              )}
            </div>
            <h2 className="font-outfit text-sm font-bold text-slate-900 dark:text-white mt-1">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-jakarta">
            {task.description}
          </p>

          {/* Submission Proof Box */}
          {task.submission && (task.submission.textNotes || (task.submission.fileUrls && task.submission.fileUrls.length > 0)) && (
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Candidate / Assignee Submission:
              </span>
              {task.submission.textNotes && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {task.submission.textNotes}
                </p>
              )}
              {task.submission.fileUrls && task.submission.fileUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {task.submission.fileUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Attachment #{i + 1}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status Decision Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Task Evaluation Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('VERIFIED')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border text-xs font-semibold transition-all ${
                  selectedStatus === 'VERIFIED'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 mb-1 text-emerald-500" />
                <span>Verify & Sign-off</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('PENDING')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border text-xs font-semibold transition-all ${
                  selectedStatus === 'PENDING'
                    ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="h-4 w-4 mb-1 text-violet-500" />
                <span>Pending</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus('REJECTED')}
                className={`flex flex-col items-center justify-center p-3 rounded-md border text-xs font-semibold transition-all ${
                  selectedStatus === 'REJECTED'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <XCircle className="h-4 w-4 mb-1 text-rose-500" />
                <span>Reject / Re-upload</span>
              </button>
            </div>
          </div>

          {/* Remarks input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reviewer Notes / Feedback
            </label>
            <Input
              name="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Asset tag LT-8842 issued; all ID checks verified."
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Evaluation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
