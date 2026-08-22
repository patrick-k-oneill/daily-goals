/**
 * Period keys are plain strings so they can index storage and survive
 * serialization: day `2026-08-21`, ISO week `2026-W34`, year `2026`.
 * All math is done in local time — a goal day is the user's wall-clock day.
 */

export type DayKey = string;
export type WeekKey = string;
export type YearKey = string;

const DAY_MS = 86_400_000;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function dayKeyOf(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DayKey {
  return dayKeyOf(new Date());
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = parseDayKey(key);
  date.setDate(date.getDate() + days);
  return dayKeyOf(date);
}

export function yesterdayKey(): DayKey {
  return addDays(todayKey(), -1);
}

/** ISO 8601 week: weeks start Monday; week 1 contains the year's first Thursday. */
export function isoWeekOf(key: DayKey): { year: number; week: number } {
  const date = parseDayKey(key);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKeyOf(key: DayKey): WeekKey {
  const { year, week } = isoWeekOf(key);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function yearKeyOf(key: DayKey): YearKey {
  return key.slice(0, 4);
}

/** Monday-first weekday index: Mon = 0 … Sun = 6. */
export function weekdayIndex(key: DayKey): number {
  return (parseDayKey(key).getDay() + 6) % 7;
}

/** The Monday of the ISO week containing `key`. */
export function weekStart(key: DayKey): DayKey {
  return addDays(key, -weekdayIndex(key));
}

/** All 7 day keys (Mon–Sun) of the ISO week containing `key`. */
export function daysOfWeek(key: DayKey): DayKey[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "Fri 8/21/26" — the way it's written at the top of the legal pad. */
export function formatPadDate(key: DayKey): string {
  const date = parseDayKey(key);
  const weekday = WEEKDAY_LABELS[weekdayIndex(key)];
  const yy = String(date.getFullYear()).slice(2);
  return `${weekday} ${date.getMonth() + 1}/${date.getDate()}/${yy}`;
}

/** "Fri, Aug 21" */
export function formatDayLong(key: DayKey): string {
  const date = parseDayKey(key);
  return `${WEEKDAY_LABELS[weekdayIndex(key)]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

/** "8/21" */
export function formatDayShort(key: DayKey): string {
  const date = parseDayKey(key);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** "Aug 18 – 24" or "Aug 31 – Sep 6" for the ISO week containing `key`. */
export function formatWeekRange(key: DayKey): string {
  const days = daysOfWeek(key);
  const start = parseDayKey(days[0]);
  const end = parseDayKey(days[6]);
  const startLabel = `${MONTH_LABELS[start.getMonth()]} ${start.getDate()}`;
  const endLabel =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : `${MONTH_LABELS[end.getMonth()]} ${end.getDate()}`;
  return `${startLabel} – ${endLabel}`;
}
