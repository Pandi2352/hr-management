import { useCallback, useEffect, useState } from 'react';
import { Check, Library, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '../../../components/ui';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SelectField } from '../../../components/ui/SelectField';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import type { BankQuestion } from '../types/quiz.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Present when the bank was opened to add questions to a quiz. */
  quizId?: string;
  onPulled?: () => void;
}

const DIFFICULTIES = [
  { value: '', label: 'Any difficulty' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

/**
 * The question bank.
 *
 * Two jobs in one screen: browsing what has been kept, and pulling some of it
 * into a quiz. The second only appears when the bank was opened from a quiz,
 * because a bare list with a disabled "add" button invites a click that cannot
 * work.
 *
 * Entries are copied into a quiz rather than linked. Editing a bank entry must
 * never change a quiz somebody has already sat, or their stored answers would
 * stop matching the question they were asked.
 */
export function QuestionBankModal({ isOpen, onClose, quizId, onPulled }: Props) {
  const toast = useToast();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<{ name: string; quizCount: number }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      setQuestions(
        await quizApi.listBank({
          search: debounced.trim() || undefined,
          difficulty: difficulty || undefined,
          category: category || undefined,
        }),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load the question bank.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, debounced, difficulty, category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isOpen) return;
    quizApi.categories().then(setCategories).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const pull = async () => {
    if (!quizId || selected.length === 0) return;
    setIsPulling(true);
    try {
      await quizApi.pullFromBank(quizId, selected);
      toast.success(`Added ${selected.length} question${selected.length === 1 ? '' : 's'}.`);
      setSelected([]);
      onPulled?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not add those questions.');
    } finally {
      setIsPulling(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await quizApi.removeFromBank(id);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
      toast.success('Removed from the bank.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not remove that question.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 flex h-[620px] max-h-[92vh] w-[880px] max-w-[96vw] flex-col overflow-hidden rounded-md border border-hairline bg-surface">
        <header className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <Library className="h-4 w-4 text-ink-3" />
              Question bank
            </h2>
            <p className="text-[11.5px] text-ink-3">
              {quizId
                ? 'Pick questions to copy into this quiz.'
                : 'Questions kept from previous quizzes, reusable in any new one.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline p-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search questions…"
            />
          </div>
          <div className="w-44">
            <SelectField
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              options={DIFFICULTIES}
            />
          </div>
          <div className="w-48">
            <SelectField
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: '', label: 'Any category' },
                ...categories.map((c) => ({ value: c.name, label: c.name })),
              ]}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-ink-3">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center">
              <Library className="mx-auto mb-2 h-6 w-6 text-ink-3" />
              <p className="text-xs text-ink-3">
                {search.trim() || difficulty || category
                  ? 'Nothing matches those filters.'
                  : 'The bank is empty. Use “Keep in bank” on a question you are happy with.'}
              </p>
            </div>
          ) : (
            questions.map((q) => {
              const isSelected = selected.includes(q._id);
              return (
                <div
                  key={q._id}
                  className={cn(
                    'rounded-md border bg-surface p-3 transition-colors',
                    isSelected ? 'border-primary bg-primary-light' : 'border-hairline',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {quizId && (
                      <button
                        type="button"
                        onClick={() => toggle(q._id)}
                        aria-pressed={isSelected}
                        aria-label={`Select "${q.prompt}"`}
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-hairline hover:border-ink-3',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">{q.prompt}</p>

                      <div className="mt-1.5 space-y-0.5">
                        {q.options.map((option, i) => (
                          <div
                            key={i}
                            className={cn(
                              'text-[11px]',
                              i === q.correctOptionIndex
                                ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                                : 'text-ink-3',
                            )}
                          >
                            {String.fromCharCode(65 + i)}. {option}
                            {i === q.correctOptionIndex && ' ✓'}
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-ink-3">
                        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium">
                          {q.category}
                        </span>
                        <span className="capitalize">{q.difficulty.toLowerCase()}</span>
                        {q.tags.map((tag) => (
                          <span key={tag} className="rounded-md bg-surface-2 px-1.5 py-0.5">
                            {tag}
                          </span>
                        ))}
                        {q.usageCount > 0 && (
                          <span>
                            used {q.usageCount} time{q.usageCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(q._id)}
                      aria-label="Remove from the bank"
                      className="shrink-0 cursor-pointer text-ink-3 transition-colors hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {quizId && (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline px-5 py-3">
            <span className="text-[11.5px] text-ink-3">
              {selected.length === 0
                ? 'Nothing selected'
                : `${selected.length} question${selected.length === 1 ? '' : 's'} selected`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={pull}
                disabled={selected.length === 0 || isPulling}
                className="gap-1.5 text-xs"
              >
                {isPulling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add to quiz
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
