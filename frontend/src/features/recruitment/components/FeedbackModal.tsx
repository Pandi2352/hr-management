import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button, Modal, SelectField } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { pipelineApi } from '../api/pipeline.api';
import { cn } from '../../../utils/cn';
import type { Interview } from '../types/pipeline.types';

/** Scorecard: star rating + hire recommendation + notes. */
export function FeedbackModal({
  isOpen,
  interview,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  interview: Interview | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [recommendation, setRecommendation] = useState('MAYBE');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!interview) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await pipelineApi.submitFeedback(interview._id, {
        rating: rating || undefined,
        recommendation,
        feedback: feedback.trim() || undefined,
      });
      toast.success('Scorecard recorded, round completed.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save feedback.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scorecard — ${interview.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className="cursor-pointer"
                aria-label={`${s} stars`}
              >
                <Star
                  className={cn(
                    'h-6 w-6 transition-colors',
                    s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <SelectField
          label="Recommendation"
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          options={[
            { value: 'HIRE', label: 'Hire — strong yes' },
            { value: 'MAYBE', label: 'Maybe — needs another round' },
            { value: 'NO_HIRE', label: 'No hire' },
          ]}
        />
        <div>
          <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            Interview notes
          </label>
          <textarea
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Strengths, gaps, culture fit…"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Submit Scorecard'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
