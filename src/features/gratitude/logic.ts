import { addDays, type DayKey } from '@/lib/dates';
import { mergeKeyed, withoutTombstone, withTombstone, type KeyOf, type Stamp } from '@/lib/merge';

import type { Gratitude, GratitudeEntries, GratitudeEntry } from './types';

export type { GratitudeEntries } from './types';

/** The day a morning's journal reflects on: the day before. */
export function reflectionDateFor(today: DayKey): DayKey {
  return addDays(today, -1);
}

/**
 * Write (or rewrite) a morning's entry; emptying the text tears the page out,
 * leaving a tombstone. Only the empty string counts as emptied: a leading
 * space or newline is a draft in progress, and the written queries already
 * ignore whitespace-only text.
 */
export function saveEntry(
  gratitude: Gratitude,
  forDate: DayKey,
  text: string,
  writtenAt: Stamp,
): Gratitude {
  const { entries, tombstones } = gratitude;
  if (text === '') {
    if (!(forDate in entries)) return gratitude;
    const { [forDate]: _removed, ...rest } = entries;
    return { entries: rest, tombstones: withTombstone(tombstones, forDate, writtenAt) };
  }
  return {
    entries: { ...entries, [forDate]: { forDate, writtenAt, text } },
    tombstones: forDate in tombstones ? withoutTombstone(tombstones, forDate) : tombstones,
  };
}

const byReflectionDate: KeyOf<GratitudeEntry> = {
  key: (e) => e.forDate,
  stamp: (e) => e.writtenAt,
};

/** Reconcile two copies of the journal morning by morning, the later writing winning (ADR 0005). */
export function mergeGratitude(local: Gratitude, remote: Gratitude): Gratitude {
  const merged = mergeKeyed(
    { items: Object.values(local.entries), tombstones: local.tombstones },
    { items: Object.values(remote.entries), tombstones: remote.tombstones },
    byReflectionDate,
  );
  return {
    entries: Object.fromEntries(merged.items.map((e) => [e.forDate, e])),
    tombstones: merged.tombstones,
  };
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
