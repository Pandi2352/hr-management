export interface ShiftRule {
  startTime: string;
  endTime: string;
  graceMinutes?: number;
}

export interface DayEvaluation {
  workMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyExit: boolean;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  isHalfDay: boolean;
  effectiveStatus: 'OPEN' | 'PRESENT' | 'HALF_DAY' | 'ABSENT';
}

/** Legacy shift codes → default timings (used until a master shift is assigned). */
export const LEGACY_SHIFT_TIMINGS: Record<string, ShiftRule> = {
  GENERAL: { startTime: '09:00', endTime: '18:00', graceMinutes: 15 },
  MORNING: { startTime: '06:00', endTime: '14:00', graceMinutes: 15 },
  EVENING: { startTime: '14:00', endTime: '22:00', graceMinutes: 15 },
  NIGHT: { startTime: '22:00', endTime: '06:00', graceMinutes: 15 },
  FLEXIBLE: { startTime: '09:00', endTime: '18:00', graceMinutes: 120 },
};

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Scheduled minutes, overnight-aware (end ≤ start spans midnight). */
export function scheduledMinutes(rule: ShiftRule): number {
  const start = toMinutes(rule.startTime);
  let end = toMinutes(rule.endTime);
  if (end <= start) end += 24 * 60;
  return end - start;
}

/**
 * Flags a day against its shift. Without checkout only lateness is known.
 * Overtime counts work beyond schedule + 30 min threshold.
 * Working hours evaluation:
 * - workMinutes >= 480 min (8h) -> Full Day (PRESENT)
 * - 240 min <= workMinutes < 480 min (4h - 7.9h) -> Half Day (HALF_DAY)
 * - workMinutes < 240 min (< 4h) -> Absent / Short Hours (ABSENT)
 */
export function evaluateDay(checkIn: string, checkOut: string, rule: ShiftRule | null): DayEvaluation {
  const empty: DayEvaluation = {
    workMinutes: 0,
    isLate: false,
    lateMinutes: 0,
    isEarlyExit: false,
    earlyExitMinutes: 0,
    overtimeMinutes: 0,
    isHalfDay: false,
    effectiveStatus: checkIn && !checkOut ? 'OPEN' : 'ABSENT',
  };

  if (!rule) {
    if (checkIn && checkOut && toMinutes(checkOut) > toMinutes(checkIn)) {
      empty.workMinutes = toMinutes(checkOut) - toMinutes(checkIn);
      if (empty.workMinutes >= 480) {
        empty.effectiveStatus = 'PRESENT';
        empty.isHalfDay = false;
      } else if (empty.workMinutes >= 240) {
        empty.effectiveStatus = 'HALF_DAY';
        empty.isHalfDay = true;
      } else {
        empty.effectiveStatus = 'ABSENT';
        empty.isHalfDay = false;
      }
    }
    return empty;
  }

  const grace = rule.graceMinutes ?? 15;
  const lateBy = toMinutes(checkIn) - (toMinutes(rule.startTime) + grace);
  if (lateBy > 0) {
    empty.isLate = true;
    empty.lateMinutes = lateBy;
  }
  if (!checkOut) {
    empty.effectiveStatus = 'OPEN';
    return empty;
  }

  const work = toMinutes(checkOut) - toMinutes(checkIn);
  empty.workMinutes = Math.max(0, work);

  // Determine Full Day vs Half Day vs Absent based on working hours
  if (empty.workMinutes >= 480) {
    empty.effectiveStatus = 'PRESENT';
    empty.isHalfDay = false;
  } else if (empty.workMinutes >= 240) {
    empty.effectiveStatus = 'HALF_DAY';
    empty.isHalfDay = true;
  } else {
    empty.effectiveStatus = 'ABSENT';
    empty.isHalfDay = false;
  }

  const scheduledEnd = toMinutes(rule.endTime);
  const endIsNextDay = scheduledEnd <= toMinutes(rule.startTime);
  const outMin = endIsNextDay && toMinutes(checkOut) < toMinutes(checkIn) ? toMinutes(checkOut) + 24 * 60 : toMinutes(checkOut);
  const effectiveEnd = endIsNextDay ? scheduledEnd + 24 * 60 : scheduledEnd;
  const earlyBy = effectiveEnd - grace - outMin;
  if (earlyBy > 0) {
    empty.isEarlyExit = true;
    empty.earlyExitMinutes = earlyBy;
  }

  const excess = empty.workMinutes - scheduledMinutes(rule);
  if (excess > 30) empty.overtimeMinutes = excess;
  return empty;
}
