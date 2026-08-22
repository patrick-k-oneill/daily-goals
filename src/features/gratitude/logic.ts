import { addDays, yesterdayKey, type DayKey } from '@/lib/dates';

import type { GratitudeEntry } from './types';

/** The day this morning's journal reflects on. */
export function currentReflectionDate(): DayKey {
  return yesterdayKey();
}

/**
 * Consecutive days journaled, counting backward from the current reflection
 * date. The current morning not being written yet doesn't break the streak —
 * the chain is measured from the most recent expected entry that exists.
 */
export function currentStreak(entries: Record<DayKey, GratitudeEntry>, reflectionDate: DayKey) {
  let cursor = reflectionDate;
  if (!entries[cursor]) cursor = addDays(cursor, -1);

  let streak = 0;
  while (entries[cursor]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Entries newest-first for the history list. */
export function sortedEntries(entries: Record<DayKey, GratitudeEntry>): GratitudeEntry[] {
  return Object.values(entries)
    .filter((e) => e.text.trim().length > 0)
    .sort((a, b) => (a.forDate < b.forDate ? 1 : -1));
}
