import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { SearchInput } from '../../../components/ui/SearchInput';
import { useToastRef } from '../../../components/ui/toast';
import { atriumApi } from '../api/atrium.api';
import { AtriumOrbitGlyph } from '../icons/AtriumIcons';
import { MoodBadge, Monogram } from './Monogram';
import { FollowButton } from './FollowButton';
import type { AtriumProfile } from '../types/atrium.types';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  mode: 'followers' | 'following';
  ownerName: string;
}

/**
 * Followers and following, sharing one component because only the fetch differs.
 *
 * Fixed size rather than one that grows with the list, for the same reason the
 * profile editor is: a modal whose height depends on how many followers someone
 * has is a modal that sometimes runs off the screen. The frame stays put and the
 * rows scroll inside it.
 *
 * Each row carries the person's cover photo as its background with their
 * portrait on top, so the list looks like the directory rather than like a
 * different product.
 */
export function FollowListModal({
  isOpen,
  onClose,
  employeeId,
  mode,
  ownerName,
}: FollowListModalProps) {
  const navigate = useNavigate();
  const toastRef = useToastRef();
  const [rows, setRows] = useState<AtriumProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const fetcher = mode === 'followers' ? atriumApi.getFollowers : atriumApi.getFollowing;
      const res = await fetcher(employeeId, {
        pageSize: 50,
        search: debounced.trim() || undefined,
      });
      setRows(res.data || []);
    } catch (err: any) {
      toastRef.current.error(
        err?.response?.data?.message || 'Could not load the list.',
        'Unavailable',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, mode, employeeId, debounced, toastRef]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const patch = (id: string, next: Partial<AtriumProfile>) =>
    setRows((prev) => prev.map((r) => (r.employeeId === id ? { ...r, ...next } : r)));

  const openProfile = (id: string) => {
    onClose();
    navigate(`/atrium/${id}`);
  };

  const title = mode === 'followers' ? `People following ${ownerName}` : `${ownerName} follows`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 flex h-[560px] max-h-[88vh] w-[440px] max-w-[95vw] flex-col overflow-hidden rounded-md border border-hairline bg-surface">
        <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <AtriumOrbitGlyph className="h-4 w-4 shrink-0 text-ink-3" />
            <h2 className="truncate text-[13.5px] font-bold text-ink">{title}</h2>
            {!isLoading && rows.length > 0 && (
              <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-ink-3">
                {rows.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-hairline p-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search by name…"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-ink-3">
              <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-xs text-ink-3">
              {search.trim()
                ? 'Nobody matches that search.'
                : mode === 'followers'
                  ? 'Nobody here yet.'
                  : `${ownerName} is not following anyone yet.`}
            </p>
          ) : (
            rows.map((person) => (
                <div
                  key={person.employeeId}
                  className="flex items-stretch overflow-hidden rounded-md border border-hairline bg-surface transition-colors hover:border-ink-3/40"
                >
                  <div className="flex flex-1 items-center gap-2.5 p-2">
                    <button
                      type="button"
                      onClick={() => openProfile(person.employeeId)}
                      aria-label={person.displayName}
                      className="shrink-0 cursor-pointer"
                    >
                      <Monogram
                        profile={person}
                        className="h-10 w-10 rounded-md border border-hairline"
                        textClassName="text-xs"
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openProfile(person.employeeId)}
                        className="block max-w-full cursor-pointer truncate text-left text-[12px] font-bold text-ink hover:underline"
                      >
                        {person.displayName}
                      </button>
                      <p className="truncate text-[10.5px] font-semibold text-primary">
                        {person.designationTitle || 'Team member'}
                      </p>
                      <p className="truncate text-[10px] text-ink-3">
                        {person.departmentName || 'Unassigned'}
                      </p>
                      <MoodBadge profile={person} className="mt-1" />
                    </div>

                    <FollowButton
                      profile={person}
                      size="sm"
                      onChange={(p) => patch(person.employeeId, p)}
                      className="shrink-0"
                    />
                  </div>
                </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
