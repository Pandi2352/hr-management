import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SelectField } from '../../../components/ui/SelectField';
import { Pagination } from '../../../components/data-table/Pagination';
import { useToastRef } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { atriumApi } from '../api/atrium.api';
import { applyFollowChange, onFollowChange } from '../atriumEvents';
import { AtriumGlyph, AtriumOrbitGlyph } from '../icons/AtriumIcons';
import { AtriumRail } from '../components/AtriumRail';
import { ColleagueCard } from '../components/ColleagueCard';
import type { AtriumFacets, AtriumProfile } from '../types/atrium.types';

type Relationship = 'all' | 'following' | 'not-following';

const RELATIONSHIP_TABS: { value: Relationship; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'following', label: 'Following' },
  { value: 'not-following', label: 'Discover' },
];

/**
 * The Atrium directory.
 *
 * The page body is only the mosaic and its filters. Everything about *you* —
 * your block, your counts, who you follow, who to follow next — lives in the
 * rail on the right, so the two halves never compete: the middle is the company,
 * the right edge is your place in it.
 */
export function AtriumDirectoryPage() {
  const toastRef = useToastRef();
  // Guards against an out-of-order response overwriting a newer one, which a
  // fast filter change or React's development double-mount both produce.
  const requestSeq = useRef(0);

  const [profiles, setProfiles] = useState<AtriumProfile[]>([]);
  const [facets, setFacets] = useState<AtriumFacets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerLinked, setViewerLinked] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('ALL');
  const [relationship, setRelationship] = useState<Relationship>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDirectory = useCallback(async () => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    try {
      const res = await atriumApi.getDirectory({
        page,
        pageSize,
        relationship,
        search: debouncedSearch.trim() || undefined,
        departmentId: departmentId !== 'ALL' ? departmentId : undefined,
      });
      if (seq !== requestSeq.current) return; // a newer request already won
      setProfiles(res.data || []);
      setTotalItems(res.meta?.totalItems ?? 0);
      setViewerLinked((res.meta as any)?.viewerLinked !== false);
    } catch (err: any) {
      if (seq !== requestSeq.current) return;
      toastRef.current.error(
        err?.response?.data?.message || 'Could not load the Atrium.',
        'Unavailable',
      );
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  }, [page, pageSize, relationship, debouncedSearch, departmentId, toastRef]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  useEffect(() => {
    atriumApi
      .getFacets()
      .then(setFacets)
      .catch(() => {
        // The department filter stays empty; the mosaic is unaffected.
      });
  }, []);

  // A follow in the rail has to move the matching card, and the reverse.
  useEffect(
    () => onFollowChange((change) => setProfiles((prev) => applyFollowChange(prev, change))),
    [],
  );

  const departmentOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All departments' },
      ...(facets?.departments ?? []).map((d) => ({
        value: d.departmentId,
        label: `${d.name} (${d.count})`,
      })),
    ],
    [facets],
  );

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Atrium"
        description="The open middle of the company. Find colleagues, follow the ones you want to hear from."
      />

      {/* A login with no employee record can look around but owns nothing here */}
      {!viewerLinked && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11.5px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Your login is not linked to an employee record, so you have no Atrium profile and cannot
          follow anyone. You can still browse the directory. Ask HR to link your account.
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-hairline bg-surface p-2.5">
            <div className="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
              {RELATIONSHIP_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setRelationship(tab.value);
                    setPage(1);
                  }}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                    relationship === tab.value
                      ? 'bg-surface text-ink'
                      : 'text-ink-3 hover:text-ink-2',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-56">
              <SearchInput
                value={search}
                onChange={setSearch}
                onClear={() => setSearch('')}
                placeholder="Search name, role, or a topic…"
              />
            </div>

            <div className="w-48">
              <SelectField
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPage(1);
                }}
                options={departmentOptions}
              />
            </div>

            <span className="ml-auto inline-flex items-center gap-1.5 pr-1 text-[11.5px] text-ink-3">
              <AtriumOrbitGlyph className="h-3.5 w-3.5" />
              {isLoading ? 'Loading…' : `${totalItems.toLocaleString()} colleagues`}
            </span>
          </div>

          {isLoading ? (
            <div className="rounded-md border border-hairline bg-surface py-20 text-center text-xs text-ink-3">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Gathering the Atrium…
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-md border border-hairline bg-surface py-20 text-center">
              <AtriumGlyph className="mx-auto mb-2 h-7 w-7 text-ink-3" />
              <p className="text-xs text-ink-3">
                {relationship === 'following'
                  ? 'You are not following anyone yet. Try Discover.'
                  : 'Nobody matches that search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {profiles.map((profile) => (
                <ColleagueCard
                  key={profile.employeeId}
                  profile={profile}
                  onChange={(employeeId, patch) =>
                    setProfiles((prev) =>
                      prev.map((p) => (p.employeeId === employeeId ? { ...p, ...patch } : p)),
                    )
                  }
                />
              ))}
            </div>
          )}

          {totalItems > pageSize && (
            <div className="rounded-md border border-hairline bg-surface p-3">
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                pageSizeOptions={[12, 24, 48]}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>

        {/* Hidden below xl, where the mosaic needs the width more than you do */}
        {viewerLinked && <AtriumRail className="hidden xl:block xl:w-[264px]" />}
      </div>
    </div>
  );
}

export default AtriumDirectoryPage;
