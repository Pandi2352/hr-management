export type HolidayType = 'FIXED' | 'RESTRICTED';

export interface Holiday {
  _id: string;
  organizationId: string;
  name: string;
  /** Calendar date as `YYYY-MM-DD`. */
  date: string;
  year: number;
  type: HolidayType;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  /** Present on the employee calendar view when the caller availed it. */
  availed?: boolean;
}

export interface HolidayCalendar {
  _id: string;
  organizationId: string;
  year: number;
  restrictedLimit: number;
  note: string;
  fixedCount: number;
  restrictedCount: number;
}

export interface RestrictedEntitlement {
  limit: number;
  availed: number;
  remaining: number;
}

export interface HolidayCalendarView {
  year: number;
  calendar: HolidayCalendar;
  restricted: RestrictedEntitlement;
  holidays: Holiday[];
}

export interface RestrictedHolidayOpt {
  _id: string;
  organizationId: string;
  employeeId: string;
  holidayId: string;
  year: number;
}
