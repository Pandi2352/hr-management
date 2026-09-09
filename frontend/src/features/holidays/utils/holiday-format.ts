/** `YYYY-MM-DD` → `01 Jan 2026`. Timezone-safe (no Date shift). */
export function formatHolidayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${String(d).padStart(2, '0')} ${months[(m || 1) - 1]} ${y}`;
}

/** `YYYY-MM-DD` → weekday name (`Thursday`). Parsed at noon to avoid TZ shift. */
export function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12).toLocaleDateString('en-US', {
    weekday: 'long',
  });
}

/** Years offered in the calendar selector: last year … +2 years. */
export function calendarYearOptions(): number[] {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1, current + 2];
}
