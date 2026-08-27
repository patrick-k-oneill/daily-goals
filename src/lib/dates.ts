/**
 * Period keys are plain strings so they can index storage and survive
 * serialization: day `2026-08-21`, ISO week `2026-W34`, year `2026`.
 * All math is done in local time — a goal day is the user's wall-clock day.
 */

export type DayKey = string;

const DAY_MS = 86_400_000;

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

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

const MONTH_LABELS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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

/** ISO 8601 week: weeks start Monday; week 1 contains the year's first Thursday. */
function isoWeekOf(key: DayKey): { year: number; week: number } {
  const date = parseDayKey(key);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKeyOf(key: DayKey): string {
  const { year, week } = isoWeekOf(key);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function yearKeyOf(key: DayKey): string {
  return key.slice(0, 4);
}

/** Monday-first weekday index: Mon = 0 … Sun = 6. */
function weekdayIndex(key: DayKey): number {
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

/** First day of the month containing `key`. */
export function monthStart(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

/** First day of the month `n` months away from the month containing `key`. */
export function addMonths(key: DayKey, n: number): DayKey {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1 + n, 1);
  return dayKeyOf(date);
}

/**
 * Monday-first calendar grid for the month containing `key`: an array of
 * weeks of 7 cells, where cells outside the month are null.
 */
export function monthGrid(key: DayKey): (DayKey | null)[][] {
  const start = monthStart(key);
  const month = start.slice(0, 7);
  const weeks: (DayKey | null)[][] = [];
  let cursor = addDays(start, -weekdayIndex(start));

  while (weeks.length < 6) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(cursor, i);
      return day.slice(0, 7) === month ? day : null;
    });
    weeks.push(week);
    cursor = addDays(cursor, 7);
    if (cursor.slice(0, 7) > month) break;
  }
  return weeks;
}

/** "August 2026" */
export function formatMonth(key: DayKey): string {
  const date = parseDayKey(key);
  return `${MONTH_LABELS_FULL[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Fri 8/21/26" — the way it's written at the top of the legal pad. */
export function formatPadDate(key: DayKey): string {
  const date = parseDayKey(key);
  const yy = String(date.getFullYear()).slice(2);
  return `${WEEKDAY_LABELS[weekdayIndex(key)]} ${date.getMonth() + 1}/${date.getDate()}/${yy}`;
}

/** "Fri, Aug 21" */
export function formatDayLong(key: DayKey): string {
  const date = parseDayKey(key);
  return `${WEEKDAY_LABELS[weekdayIndex(key)]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

/** "Sun 8/23" — the way an event is jotted at the bottom of the page. */
export function formatDayWithWeekday(key: DayKey): string {
  const date = parseDayKey(key);
  return `${WEEKDAY_LABELS[weekdayIndex(key)]} ${date.getMonth() + 1}/${date.getDate()}`;
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
