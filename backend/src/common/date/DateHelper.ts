/** Wall-clock fields of an instant as observed in some timezone. */
export interface ZonedParts {
  year: number;
  month: number; // 1-12, not the 0-11 the Date API uses
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export interface TenureBreakdown {
  years: number;
  months: number;
  days: number;
  /** Whole days across the entire span, for sorting and thresholds. */
  totalDays: number;
}

/** Weekend days as `Date.getDay()` values. Fri/Sat in much of the Gulf. */
export type WeekendDays = readonly number[];

const DEFAULT_WEEKEND: WeekendDays = [0, 6]; // Sunday, Saturday

/**
 * DateHelper — date arithmetic, comparison, formatting and business-day logic.
 *
 * Two rules this class exists to enforce:
 *
 * 1. **`YYYY-MM-DD` strings are parsed as local dates, never as UTC.**
 *    `new Date('2026-03-16')` is defined to parse as UTC midnight, so in any
 *    timezone west of Greenwich `.getDate()` returns the 15th. This codebase
 *    stores `joiningDate`, `dateOfBirth` and `lastWorkingDate` as date-only
 *    strings, so that off-by-one is a real hazard — use `parseDateOnly()`.
 *
 * 2. **Calendar arithmetic is done on calendar fields, not on milliseconds.**
 *    A day is not always 86,400,000 ms; DST transitions make it 23 or 25 hours.
 *    Anything counting *days* works on date parts, and only genuinely elapsed
 *    durations divide milliseconds.
 *
 * @example
 * ```typescript
 * const d = DateHelper.Instance;
 *
 * d.parseDateOnly('2026-03-16');                  // local midnight, not UTC
 * d.addBusinessDays(new Date(), 5);               // skips weekends
 * d.getTenure(joiningDate);                       // { years, months, days }
 * d.formatInTimeZone(new Date(), 'Asia/Kolkata'); // correct wall clock
 * ```
 */
export class DateHelper {
  private static _instance: DateHelper;

  private static readonly MS_PER_SECOND = 1000;
  private static readonly MS_PER_MINUTE = 60 * 1000;
  private static readonly MS_PER_HOUR = 60 * 60 * 1000;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  /** Organization default; overridable per call. */
  static readonly DEFAULT_TIMEZONE = 'Asia/Kolkata';

  /** Formatters are expensive to build and safe to reuse. */
  private readonly formatterCache = new Map<string, Intl.DateTimeFormat>();

  static get Instance(): DateHelper {
    if (!this._instance) {
      this._instance = new DateHelper();
    }
    return this._instance;
  }

  // --- Timezone ------------------------------------------------------------

  /**
   * The wall-clock fields of an instant as observed in `timeZone`.
   *
   * This is the honest primitive the rest of the timezone handling builds on:
   * it answers "what does the clock in Kolkata read at this instant" without
   * pretending the answer is itself an instant.
   */
  getZonedParts(date: Date, timeZone: string = DateHelper.DEFAULT_TIMEZONE): ZonedParts {
    this.assertValid(date);

    const parts = this.formatter(timeZone).formatToParts(date);
    const read = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

    return {
      year: read('year'),
      month: read('month'),
      day: read('day'),
      hour: read('hour') % 24, // hourCycle h23 still reports 24 at midnight in some ICU builds
      minute: read('minute'),
      second: read('second'),
      millisecond: date.getMilliseconds(),
    };
  }

  /**
   * A Date whose **local getters** read as the wall clock in `timeZone`.
   *
   * ⚠️ The returned Date does **not** represent the same instant as the input —
   * it is shifted so that `.getHours()` and friends return the target zone's
   * values. It is a display/formatting convenience only. Never persist it,
   * compare it against a real instant, or send it to the database.
   *
   * For display prefer `formatInTimeZone()`; for arithmetic use the original
   * Date, which already carries the correct instant.
   */
  getLocalDate(target_date: Date, timeZone: string = DateHelper.DEFAULT_TIMEZONE): Date {
    const p = this.getZonedParts(target_date, timeZone);
    // Built from parts rather than by re-parsing a locale string: parsing
    // `toLocaleString()` output is implementation-defined and silently drops
    // milliseconds.
    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond);
  }

  /** Current instant expressed as wall-clock fields of the default timezone. */
  getCurrentLocalDate(): Date {
    return this.getLocalDate(new Date());
  }

  /** `YYYY-MM-DD HH:MM:SS` as read in `timeZone`. The correct way to display an instant. */
  formatInTimeZone(date: Date, timeZone: string = DateHelper.DEFAULT_TIMEZONE): string {
    const p = this.getZonedParts(date, timeZone);
    const pad = (n: number, width = 2) => String(n).padStart(width, '0');
    return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
  }

  /** `YYYY-MM-DD` as read in `timeZone`. */
  formatDateInTimeZone(date: Date, timeZone: string = DateHelper.DEFAULT_TIMEZONE): string {
    return this.formatInTimeZone(date, timeZone).slice(0, 10);
  }

  private formatter(timeZone: string): Intl.DateTimeFormat {
    let f = this.formatterCache.get(timeZone);
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      this.formatterCache.set(timeZone, f);
    }
    return f;
  }

  // --- Parsing -------------------------------------------------------------

  /**
   * Parses a `YYYY-MM-DD` string as **local** midnight.
   *
   * `new Date('2026-03-16')` is specified to parse as UTC midnight, so west of
   * Greenwich the calendar day comes back one short. Every date-only column in
   * this codebase goes through here.
   *
   * @returns `null` for empty, malformed or non-existent dates (e.g. 2026-02-30).
   */
  parseDateOnly(value: string | null | undefined): Date | null {
    if (!value) return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return null;

    const [, y, m, d] = match.map(Number) as unknown as [string, number, number, number];
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);

    // Rejects overflow: `new Date(2026, 1, 30)` silently becomes 2 March.
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null;
    }
    return date;
  }

  /** True when the value is a Date representing a real instant. */
  isValid(value: unknown): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }

  private assertValid(date: Date): void {
    if (!this.isValid(date)) {
      throw new TypeError('DateHelper received an invalid Date');
    }
  }

  // --- Day boundaries ------------------------------------------------------

  /**
   * Sets time to 00:00:00.000.
   *
   * **Mutates the argument.** Retained for existing callers; prefer
   * `getStartDateImmutable()`.
   */
  getStartDate(date: Date): Date {
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Sets time to 23:59:59.999.
   *
   * **Mutates the argument.** Retained for existing callers; prefer
   * `getEndDateImmutable()`.
   */
  getEndDate(date: Date): Date {
    date.setHours(23, 59, 59, 999);
    return date;
  }

  getStartDateImmutable(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  getEndDateImmutable(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  startOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
  }

  endOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  /** Inclusive first/last instant of the quarter containing `date`. */
  quarterRange(date: Date): { start: Date; end: Date } {
    const firstMonth = Math.floor(date.getMonth() / 3) * 3;
    return {
      start: new Date(date.getFullYear(), firstMonth, 1, 0, 0, 0, 0),
      end: new Date(date.getFullYear(), firstMonth + 3, 0, 23, 59, 59, 999),
    };
  }

  // --- Differences ---------------------------------------------------------

  /** Elapsed days, fractional. For whole calendar days use `getCalendarDaysBetween()`. */
  getDiffInDays(start_date: Date, end_date: Date): number {
    return (end_date.getTime() - start_date.getTime()) / DateHelper.MS_PER_DAY;
  }

  /**
   * Whole calendar days between two dates, ignoring time of day.
   *
   * Computed from midnight-to-midnight UTC of the local calendar fields, so a
   * DST transition — which makes a day 23 or 25 hours — cannot round the answer
   * to the wrong integer the way dividing elapsed milliseconds does.
   */
  getCalendarDaysBetween(start_date: Date, end_date: Date): number {
    const toUtcMidnight = (d: Date) =>
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round(
      (toUtcMidnight(end_date) - toUtcMidnight(start_date)) / DateHelper.MS_PER_DAY,
    );
  }

  /** Whole calendar months between two dates. */
  getDiffInMonths(start_date: Date, end_date: Date): number {
    const yearDiff = end_date.getFullYear() - start_date.getFullYear();
    const monthDiff = end_date.getMonth() - start_date.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  getDiffInHours(start_date: Date, end_date: Date): number {
    return (end_date.getTime() - start_date.getTime()) / DateHelper.MS_PER_HOUR;
  }

  getDiffInMinutes(start_date: Date, end_date: Date): number {
    return (end_date.getTime() - start_date.getTime()) / DateHelper.MS_PER_MINUTE;
  }

  getDiffInSeconds(start_date: Date, end_date: Date): number {
    return (end_date.getTime() - start_date.getTime()) / DateHelper.MS_PER_SECOND;
  }

  // --- Arithmetic ----------------------------------------------------------

  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Adds months, clamping to the end of a shorter target month.
   *
   * `setMonth` alone overflows — 31 Jan + 1 month becomes 3 March, because
   * 31 February rolls forward. Probation and confirmation dates are computed
   * this way, so the clamp is not cosmetic.
   */
  addMonths(date: Date, months: number): Date {
    const day = date.getDate();
    const result = new Date(date);

    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    result.setDate(Math.min(day, this.getDaysInMonth(result.getFullYear(), result.getMonth())));

    return result;
  }

  /** Adds years, clamping 29 February to the 28th in a non-leap year. */
  addYears(date: Date, years: number): Date {
    return this.addMonths(date, years * 12);
  }

  addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * DateHelper.MS_PER_HOUR);
  }

  addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * DateHelper.MS_PER_MINUTE);
  }

  addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * DateHelper.MS_PER_SECOND);
  }

  // --- Comparison ----------------------------------------------------------

  isBefore(date1: Date, date2: Date): boolean {
    return date1.getTime() < date2.getTime();
  }

  isAfter(date1: Date, date2: Date): boolean {
    return date1.getTime() > date2.getTime();
  }

  isSame(date1: Date, date2: Date): boolean {
    return date1.getTime() === date2.getTime();
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  isBetween(date: Date, start: Date, end: Date): boolean {
    const t = date.getTime();
    return t >= start.getTime() && t <= end.getTime();
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  isPast(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /** Earliest of the given dates; `null` when none are valid. */
  min(...dates: Date[]): Date | null {
    const valid = dates.filter((d) => this.isValid(d));
    return valid.length ? valid.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b)) : null;
  }

  /** Latest of the given dates; `null` when none are valid. */
  max(...dates: Date[]): Date | null {
    const valid = dates.filter((d) => this.isValid(d));
    return valid.length ? valid.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b)) : null;
  }

  // --- Calendar facts ------------------------------------------------------

  isWeekend(date: Date, weekend: WeekendDays = DEFAULT_WEEKEND): boolean {
    return weekend.includes(date.getDay());
  }

  isWeekday(date: Date, weekend: WeekendDays = DEFAULT_WEEKEND): boolean {
    return !this.isWeekend(date, weekend);
  }

  /** ISO 8601 week number (1-53). */
  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / DateHelper.MS_PER_DAY + 1) / 7);
  }

  /**
   * Day of the year (1-366).
   *
   * Counted from calendar fields rather than an elapsed-millisecond division,
   * which lands a day short on the DST transition in zones that observe it.
   */
  getDayOfYear(date: Date): number {
    return this.getCalendarDaysBetween(this.startOfYear(date), date) + 1;
  }

  getQuarter(date: Date): number {
    return Math.floor(date.getMonth() / 3) + 1;
  }

  isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /** @param month 0-11, matching the Date API. */
  getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  // --- Formatting ----------------------------------------------------------

  /** `YYYY-MM-DD` from local calendar fields — the storage format for date-only columns. */
  formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  /** `HH:MM:SS`. */
  formatTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  /** `YYYY-MM-DD HH:MM:SS`. */
  formatDateTime(date: Date): string {
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  }

  // --- Business days -------------------------------------------------------

  /**
   * @param holidays `YYYY-MM-DD` strings, so a holiday calendar can be stored
   *   and compared without timezone ambiguity.
   */
  isBusinessDay(
    date: Date,
    holidays: readonly string[] = [],
    weekend: WeekendDays = DEFAULT_WEEKEND,
  ): boolean {
    return !this.isWeekend(date, weekend) && !holidays.includes(this.formatDate(date));
  }

  /**
   * Advances (or rewinds, for a negative count) by whole business days.
   *
   * Steps one calendar day at a time rather than adding `days * 7/5`, which
   * drifts as soon as a holiday or a non-standard weekend is involved.
   */
  addBusinessDays(
    date: Date,
    days: number,
    holidays: readonly string[] = [],
    weekend: WeekendDays = DEFAULT_WEEKEND,
  ): Date {
    if (days === 0) return new Date(date);

    const step = days > 0 ? 1 : -1;
    let remaining = Math.abs(Math.trunc(days));
    let cursor = new Date(date);

    while (remaining > 0) {
      cursor = this.addDays(cursor, step);
      if (this.isBusinessDay(cursor, holidays, weekend)) remaining--;
    }
    return cursor;
  }

  /**
   * Business days in `[start, end]`, both inclusive.
   *
   * Returns 0 when the range is inverted rather than a negative count, so a
   * caller that swapped its arguments gets an obviously wrong answer instead of
   * a plausible one.
   */
  getBusinessDaysBetween(
    start: Date,
    end: Date,
    holidays: readonly string[] = [],
    weekend: WeekendDays = DEFAULT_WEEKEND,
  ): number {
    if (this.isAfter(start, end)) return 0;

    let count = 0;
    let cursor = this.getStartDateImmutable(start);
    const last = this.getStartDateImmutable(end);

    while (cursor.getTime() <= last.getTime()) {
      if (this.isBusinessDay(cursor, holidays, weekend)) count++;
      cursor = this.addDays(cursor, 1);
    }
    return count;
  }

  /** The next business day strictly after `date`. */
  nextBusinessDay(
    date: Date,
    holidays: readonly string[] = [],
    weekend: WeekendDays = DEFAULT_WEEKEND,
  ): Date {
    return this.addBusinessDays(date, 1, holidays, weekend);
  }

  // --- HR-specific ---------------------------------------------------------

  /**
   * Completed years since `dateOfBirth`.
   *
   * Counts completed years, so someone turns 30 on their birthday and not the
   * day before — which a `diffInDays / 365.25` approximation gets wrong.
   */
  getAge(dateOfBirth: Date, asOf: Date = new Date()): number {
    let age = asOf.getFullYear() - dateOfBirth.getFullYear();
    const monthDelta = asOf.getMonth() - dateOfBirth.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Service length as years, months and days.
   *
   * Counts whole elapsed months first, then measures the remainder from the
   * resulting anchor date. Borrowing "the previous month's length" instead
   * looks right but is not: 31 Jan → 1 Mar leaves −30 days, and adding
   * February's 28 still leaves −2, so the breakdown silently loses a day.
   * Anchoring on `addMonths` — which already clamps 31 Jan + 1 month to
   * 28 Feb — gives the exact remainder for every month length.
   */
  getTenure(joiningDate: Date, asOf: Date = new Date()): TenureBreakdown {
    if (this.isAfter(joiningDate, asOf)) {
      return { years: 0, months: 0, days: 0, totalDays: 0 };
    }

    // The naive month delta overshoots by at most one, when the day-of-month
    // has not yet come round.
    let wholeMonths = this.getDiffInMonths(joiningDate, asOf);
    if (this.isAfter(this.addMonths(joiningDate, wholeMonths), asOf)) {
      wholeMonths--;
    }

    const anchor = this.addMonths(joiningDate, wholeMonths);

    return {
      years: Math.floor(wholeMonths / 12),
      months: wholeMonths % 12,
      days: this.getCalendarDaysBetween(anchor, asOf),
      totalDays: this.getCalendarDaysBetween(joiningDate, asOf),
    };
  }

  /** Every date in `[start, end]` inclusive — for building calendars and rosters. */
  eachDayBetween(start: Date, end: Date): Date[] {
    if (this.isAfter(start, end)) return [];

    const out: Date[] = [];
    let cursor = this.getStartDateImmutable(start);
    const last = this.getStartDateImmutable(end);

    while (cursor.getTime() <= last.getTime()) {
      out.push(cursor);
      cursor = this.addDays(cursor, 1);
    }
    return out;
  }
}
