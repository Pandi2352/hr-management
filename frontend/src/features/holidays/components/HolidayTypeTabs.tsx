import { SegmentedTabs } from '../../../components/ui';
import type { HolidayType } from '../types/holidays.types';

export type HolidayTab = HolidayType;

export function HolidayTypeTabs({
  active,
  fixedCount,
  restrictedCount,
  onChange,
}: {
  active: HolidayTab;
  fixedCount: number;
  restrictedCount: number;
  onChange: (tab: HolidayTab) => void;
}) {
  return (
    <SegmentedTabs<HolidayTab>
      active={active}
      onChange={onChange}
      tabs={[
        { id: 'FIXED', label: 'Fixed holidays', count: fixedCount },
        { id: 'RESTRICTED', label: 'Restricted holidays', count: restrictedCount },
      ]}
    />
  );
}
