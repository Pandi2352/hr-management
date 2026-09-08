import { DateHelper } from './DateHelper';

const d = DateHelper.Instance;

/** Local-midnight constructor, so assertions never depend on the runner's timezone. */
const at = (y: number, m: number, day: number, h = 0, min = 0, s = 0) =>
  new Date(y, m - 1, day, h, min, s, 0);

describe('DateHelper', () => {
  it('is a singleton', () => {
    expect(DateHelper.Instance).toBe(DateHelper.Instance);
  });
});

describe('parseDateOnly', () => {
  it('parses a date-only string as the local calendar day', () => {
    const parsed = d.parseDateOnly('2026-03-16')!;

    // The whole point: `new Date('2026-03-16')` is UTC midnight, which is the
    // 15th anywhere west of Greenwich. These must be the requested fields.
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(16);
    expect(parsed.getHours()).toBe(0);
  });

  it('accepts a full ISO timestamp and keeps only the calendar day', () => {
    expect(d.formatDate(d.parseDateOnly('2026-03-16T18:45:00Z')!)).toBe('2026-03-16');
  });

  it('rejects malformed and non-existent dates instead of silently rolling over', () => {
    expect(d.parseDateOnly('2026-02-30')).toBeNull(); // would become 2 March
    expect(d.parseDateOnly('2026-13-01')).toBeNull();
    expect(d.parseDateOnly('16-03-2026')).toBeNull();
    expect(d.parseDateOnly('')).toBeNull();
    expect(d.parseDateOnly(null)).toBeNull();
  });

  it('round-trips through formatDate', () => {
    for (const s of ['2024-02-29', '2026-01-01', '2026-12-31']) {
      expect(d.formatDate(d.parseDateOnly(s)!)).toBe(s);
    }
  });
});

describe('arithmetic', () => {
  it('clamps month addition to the end of a shorter month', () => {
    // Plain setMonth() overflows 31 Feb into 3 March — probation dates are
    // computed this way, so the clamp is load-bearing.
    expect(d.formatDate(d.addMonths(at(2026, 1, 31), 1))).toBe('2026-02-28');
    expect(d.formatDate(d.addMonths(at(2024, 1, 31), 1))).toBe('2024-02-29');
    expect(d.formatDate(d.addMonths(at(2026, 3, 31), -1))).toBe('2026-02-28');
  });

  it('clamps 29 February when adding years', () => {
    expect(d.formatDate(d.addYears(at(2024, 2, 29), 1))).toBe('2025-02-28');
    expect(d.formatDate(d.addYears(at(2024, 2, 29), 4))).toBe('2028-02-29');
  });

  it('adds and subtracts days across month and year boundaries', () => {
    expect(d.formatDate(d.addDays(at(2026, 12, 30), 5))).toBe('2027-01-04');
    expect(d.formatDate(d.addDays(at(2026, 1, 3), -5))).toBe('2025-12-29');
  });

  it('never mutates its argument', () => {
    const original = at(2026, 3, 16);
    const snapshot = original.getTime();

    d.addDays(original, 10);
    d.addMonths(original, 2);
    d.addYears(original, 1);
    d.addHours(original, 6);
    d.getStartDateImmutable(original);
    d.getEndDateImmutable(original);

    expect(original.getTime()).toBe(snapshot);
  });

  it('getStartDate/getEndDate do mutate, as documented', () => {
    const date = at(2026, 3, 16, 14, 30);
    d.getStartDate(date);
    expect(date.getHours()).toBe(0);
  });
});

describe('differences', () => {
  it('counts whole calendar days regardless of time of day', () => {
    expect(d.getCalendarDaysBetween(at(2026, 3, 1, 23, 59), at(2026, 3, 2, 0, 1))).toBe(1);
    expect(d.getCalendarDaysBetween(at(2026, 3, 16), at(2026, 3, 16, 23))).toBe(0);
    expect(d.getCalendarDaysBetween(at(2026, 3, 16), at(2026, 3, 9))).toBe(-7);
  });

  it('reports fractional elapsed days, hours, minutes and seconds', () => {
    expect(d.getDiffInDays(at(2026, 1, 1), at(2026, 1, 8))).toBeCloseTo(7);
    expect(d.getDiffInHours(at(2026, 1, 1, 10), at(2026, 1, 1, 15, 30))).toBeCloseTo(5.5);
    expect(d.getDiffInMinutes(at(2026, 1, 1, 10), at(2026, 1, 1, 10, 45, 30))).toBeCloseTo(45.5);
    expect(d.getDiffInSeconds(at(2026, 1, 1, 10), at(2026, 1, 1, 10, 0, 45))).toBeCloseTo(45);
  });

  it('counts calendar months', () => {
    expect(d.getDiffInMonths(at(2026, 1, 15), at(2026, 4, 15))).toBe(3);
    expect(d.getDiffInMonths(at(2025, 11, 1), at(2026, 2, 1))).toBe(3);
  });
});

describe('comparison', () => {
  it('orders and matches dates', () => {
    expect(d.isBefore(at(2026, 1, 1), at(2026, 12, 31))).toBe(true);
    expect(d.isAfter(at(2026, 12, 31), at(2026, 1, 1))).toBe(true);
    expect(d.isSame(at(2026, 1, 1), at(2026, 1, 1))).toBe(true);
    expect(d.isSameDay(at(2026, 1, 15, 10), at(2026, 1, 15, 22))).toBe(true);
    expect(d.isBetween(at(2026, 6, 15), at(2026, 1, 1), at(2026, 12, 31))).toBe(true);
  });

  it('treats range bounds as inclusive', () => {
    const start = at(2026, 1, 1);
    expect(d.isBetween(start, start, at(2026, 12, 31))).toBe(true);
  });

  it('picks min and max, ignoring invalid dates', () => {
    const a = at(2026, 1, 1);
    const b = at(2026, 6, 1);

    expect(d.min(b, a)).toBe(a);
    expect(d.max(a, b)).toBe(b);
    expect(d.max(a, new Date('nonsense'))).toBe(a);
    expect(d.min()).toBeNull();
  });
});

describe('calendar facts', () => {
  it('identifies weekends, with an overridable definition', () => {
    expect(d.isWeekend(at(2026, 3, 14))).toBe(true); // Saturday
    expect(d.isWeekend(at(2026, 3, 16))).toBe(false); // Monday
    expect(d.isWeekday(at(2026, 3, 16))).toBe(true);
    // Fri/Sat weekend, as used across much of the Gulf.
    expect(d.isWeekend(at(2026, 3, 13), [5, 6])).toBe(true);
    expect(d.isWeekend(at(2026, 3, 15), [5, 6])).toBe(false);
  });

  it('computes ISO week numbers', () => {
    expect(d.getWeekNumber(at(2026, 1, 1))).toBe(1);
    expect(d.getWeekNumber(at(2026, 12, 31))).toBe(53);
  });

  it('computes day of year across a leap year', () => {
    expect(d.getDayOfYear(at(2026, 1, 1))).toBe(1);
    expect(d.getDayOfYear(at(2024, 3, 1))).toBe(61); // 31 + 29 + 1
    expect(d.getDayOfYear(at(2026, 12, 31))).toBe(365);
    expect(d.getDayOfYear(at(2024, 12, 31))).toBe(366);
  });

  it('computes quarters and their ranges', () => {
    expect(d.getQuarter(at(2026, 5, 15))).toBe(2);
    const q = d.quarterRange(at(2026, 5, 15));
    expect(d.formatDate(q.start)).toBe('2026-04-01');
    expect(d.formatDate(q.end)).toBe('2026-06-30');
  });

  it('knows leap years and month lengths', () => {
    expect(d.isLeapYear(2024)).toBe(true);
    expect(d.isLeapYear(2100)).toBe(false); // divisible by 100, not 400
    expect(d.isLeapYear(2000)).toBe(true);
    expect(d.getDaysInMonth(2024, 1)).toBe(29);
    expect(d.getDaysInMonth(2026, 1)).toBe(28);
  });

  it('produces month and year boundaries', () => {
    expect(d.formatDate(d.startOfMonth(at(2026, 3, 16)))).toBe('2026-03-01');
    expect(d.formatDateTime(d.endOfMonth(at(2026, 2, 5)))).toBe('2026-02-28 23:59:59');
    expect(d.formatDate(d.startOfYear(at(2026, 7, 4)))).toBe('2026-01-01');
    expect(d.formatDate(d.endOfYear(at(2026, 7, 4)))).toBe('2026-12-31');
  });
});

describe('business days', () => {
  // 2026-03-16 is a Monday.
  const monday = at(2026, 3, 16);

  it('skips weekends when advancing', () => {
    expect(d.formatDate(d.addBusinessDays(monday, 5))).toBe('2026-03-23');
    expect(d.formatDate(d.addBusinessDays(at(2026, 3, 20), 1))).toBe('2026-03-23'); // Fri -> Mon
  });

  it('skips holidays as well as weekends', () => {
    const holidays = ['2026-03-18'];
    expect(d.formatDate(d.addBusinessDays(monday, 2, holidays))).toBe('2026-03-19');
  });

  it('rewinds on a negative count', () => {
    expect(d.formatDate(d.addBusinessDays(monday, -1))).toBe('2026-03-13'); // previous Friday
  });

  it('counts business days inclusively', () => {
    expect(d.getBusinessDaysBetween(monday, at(2026, 3, 20))).toBe(5);
    expect(d.getBusinessDaysBetween(monday, at(2026, 3, 22))).toBe(5); // weekend adds none
    expect(d.getBusinessDaysBetween(monday, at(2026, 3, 20), ['2026-03-18'])).toBe(4);
  });

  it('returns zero for an inverted range rather than a negative count', () => {
    expect(d.getBusinessDaysBetween(at(2026, 3, 20), monday)).toBe(0);
  });

  it('identifies business days', () => {
    expect(d.isBusinessDay(monday)).toBe(true);
    expect(d.isBusinessDay(at(2026, 3, 14))).toBe(false);
    expect(d.isBusinessDay(monday, ['2026-03-16'])).toBe(false);
  });
});

describe('HR calculations', () => {
  it('counts completed years of age, not fractions', () => {
    const dob = at(1996, 7, 22);

    expect(d.getAge(dob, at(2026, 7, 21))).toBe(29); // day before the birthday
    expect(d.getAge(dob, at(2026, 7, 22))).toBe(30); // on the birthday
    expect(d.getAge(dob, at(2026, 7, 23))).toBe(30);
  });

  it('breaks tenure into years, months and days', () => {
    const joined = at(2023, 1, 15);

    expect(d.getTenure(joined, at(2026, 3, 16))).toMatchObject({ years: 3, months: 2, days: 1 });
    expect(d.getTenure(joined, at(2023, 1, 15))).toMatchObject({ years: 0, months: 0, days: 0 });
  });

  it('borrows a real month length when the day-of-month goes negative', () => {
    // 31 Jan -> 1 Mar is 1 month and 1 day (February has 28 days in 2026),
    // which a fixed 30-day assumption gets wrong.
    expect(d.getTenure(at(2026, 1, 31), at(2026, 3, 1))).toMatchObject({
      years: 0,
      months: 1,
      days: 1,
    });
  });

  it('reports total days alongside the breakdown', () => {
    expect(d.getTenure(at(2026, 3, 1), at(2026, 3, 16)).totalDays).toBe(15);
  });

  it('enumerates every day in an inclusive range', () => {
    const days = d.eachDayBetween(at(2026, 3, 16), at(2026, 3, 20));
    expect(days).toHaveLength(5);
    expect(d.formatDate(days[0])).toBe('2026-03-16');
    expect(d.formatDate(days[4])).toBe('2026-03-20');
    expect(d.eachDayBetween(at(2026, 3, 20), at(2026, 3, 16))).toEqual([]);
  });
});

describe('timezone handling', () => {
  const instant = new Date('2026-03-16T18:45:30.123Z');

  it('reads the wall clock of a zone without depending on the runner timezone', () => {
    // 18:45:30 UTC is 00:15:30 on the 17th in Kolkata (+05:30).
    expect(d.getZonedParts(instant, 'Asia/Kolkata')).toMatchObject({
      year: 2026,
      month: 3,
      day: 17,
      hour: 0,
      minute: 15,
      second: 30,
    });

    // ...and 14:45:30 on the 16th in New York (-04:00 in March).
    expect(d.getZonedParts(instant, 'America/New_York')).toMatchObject({
      day: 16,
      hour: 14,
      minute: 45,
    });
  });

  it('formats an instant in a zone', () => {
    expect(d.formatInTimeZone(instant, 'Asia/Kolkata')).toBe('2026-03-17 00:15:30');
    expect(d.formatDateInTimeZone(instant, 'America/New_York')).toBe('2026-03-16');
  });

  it('getLocalDate exposes the zone wall clock through local getters', () => {
    const local = d.getLocalDate(instant, 'Asia/Kolkata');

    expect(local.getDate()).toBe(17);
    expect(local.getHours()).toBe(0);
    expect(local.getMinutes()).toBe(15);
    // Preserved, unlike the toLocaleString round-trip this replaced.
    expect(local.getMilliseconds()).toBe(123);
  });

  it('handles midnight without reporting hour 24', () => {
    // 18:30:00Z is exactly 00:00 in Kolkata.
    const parts = d.getZonedParts(new Date('2026-03-16T18:30:00Z'), 'Asia/Kolkata');
    expect(parts.hour).toBe(0);
    expect(parts.day).toBe(17);
  });

  it('rejects an invalid date rather than emitting NaN fields', () => {
    expect(() => d.getZonedParts(new Date('nonsense'))).toThrow(TypeError);
  });
});
