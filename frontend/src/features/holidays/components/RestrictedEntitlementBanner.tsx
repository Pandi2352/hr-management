import type { RestrictedEntitlement } from '../types/holidays.types';

export function RestrictedEntitlementBanner({
  entitlement,
  year,
}: {
  entitlement: RestrictedEntitlement;
  year: number;
}) {
  return (
    <div className="rounded-sm border border-slate-300 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      You are entitled to take {entitlement.limit} restricted holidays until December 31,{' '}
      {year}. You have availed {entitlement.availed} out of them.
    </div>
  );
}
