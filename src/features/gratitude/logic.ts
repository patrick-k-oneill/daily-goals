import { addDays, type DayKey } from '@/lib/dates';

import type { GratitudeEntry } from './types';

export type GratitudeEntries = Record<DayKey, GratitudeEntry>;

/** The day a morning's journal reflects on: the day before. */
export function reflectionDateFor(today: DayKey): DayKey {
  return addDays(today, -1);
}

/** Write (or rewrite) a morning's entry; emptying the text tears the page out. */
export function saveEntry(
  entries: GratitudeEntries,
  forDate: DayKey,
  text: string,
  writtenAt: string,
): GratitudeEntries {
  if (!text.trim()) {
    if (!(forDate in entries)) return entries;
    const { [forDate]: _removed, ...rest } = entries;
    return rest;
  }
  return { ...entries, [forDate]: { forDate, writtenAt, text } };
}

/** Whether a morning was actually written about (not blank). */
export function hasEntry(entries: GratitudeEntries, day: DayKey): boolean {
  return isWritten(entries[day]);
}

/**
 * Consecutive days journaled, counting backward from the current reflection
 * date. The current morning not being written yet doesn't break the streak —
 * the chain is measured from the most recent expected entry that exists.
 */
export function currentStreak(entries: GratitudeEntries, reflectionDate: DayKey) {
  let cursor = reflectionDate;
  if (!hasEntry(entries, cursor)) cursor = addDays(cursor, -1);

  let streak = 0;
  while (hasEntry(entries, cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Written entries newest-first for the history list. */
export function sortedEntries(entries: GratitudeEntries): GratitudeEntry[] {
  return Object.values(entries)
    .filter(isWritten)
    .sort((a, b) => (a.forDate < b.forDate ? 1 : -1));
}

function isWritten(entry: GratitudeEntry | undefined): entry is GratitudeEntry {
  return Boolean(entry?.text.trim());
}
