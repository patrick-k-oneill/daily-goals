import type { DayKey } from '@/lib/dates';
import { newId } from '@/lib/id';
import { mergeKeyed, withTombstone, type KeyOf, type Stamp } from '@/lib/merge';

import type { LegacyUpcomingEvent, UpcomingEvent, UpcomingEvents } from './types';

export interface EventInput {
  date: DayKey;
  title: string;
  timeLabel?: string;
  note?: string;
}

export interface EventPatch {
  date?: DayKey;
  title?: string;
  timeLabel?: string;
  note?: string;
}

/** Jot a new event. Fields are trimmed and blank optionals dropped; a blank title jots nothing. */
export function addEvent(upcoming: UpcomingEvents, input: EventInput, now: Stamp): UpcomingEvents {
  const title = input.title.trim();
  if (!title) return upcoming;
  return {
    ...upcoming,
    events: [
      ...upcoming.events,
      {
        id: newId(),
        date: input.date,
        title,
        timeLabel: trimOptional(input.timeLabel),
        note: trimOptional(input.note),
        updatedAt: now,
      },
    ],
  };
}

/**
 * Update one event in place, trimming like addEvent. A patch that blanks the
 * title is rejected wholesale (events always keep a title) and returns the
 * input untouched, as does an unknown id.
 */
export function updateEvent(
  upcoming: UpcomingEvents,
  id: string,
  patch: EventPatch,
  now: Stamp,
): UpcomingEvents {
  const title = patch.title?.trim();
  if (patch.title !== undefined && !title) return upcoming;
  if (!upcoming.events.some((e) => e.id === id)) return upcoming;

  return {
    ...upcoming,
    events: upcoming.events.map((e) =>
      e.id === id
        ? {
            ...e,
            date: patch.date ?? e.date,
            title: title ?? e.title,
            timeLabel: patch.timeLabel === undefined ? e.timeLabel : trimOptional(patch.timeLabel),
            note: patch.note === undefined ? e.note : trimOptional(patch.note),
            updatedAt: now,
          }
        : e,
    ),
  };
}

/** Scratch an event out, leaving a tombstone so no copy of it comes back. */
export function removeEvent(upcoming: UpcomingEvents, id: string, now: Stamp): UpcomingEvents {
  if (!upcoming.events.some((e) => e.id === id)) return upcoming;
  return {
    events: upcoming.events.filter((e) => e.id !== id),
    tombstones: withTombstone(upcoming.tombstones, id, now),
  };
}

const byId: KeyOf<UpcomingEvent> = { key: (e) => e.id, stamp: (e) => e.updatedAt };

/** Reconcile two copies of the jottings event by event, the later write winning (ADR 0005). */
export function mergeEvents(local: UpcomingEvents, remote: UpcomingEvents): UpcomingEvents {
  const merged = mergeKeyed(
    { items: local.events, tombstones: local.tombstones },
    { items: remote.events, tombstones: remote.tombstones },
    byId,
  );
  return { events: merged.items, tombstones: merged.tombstones };
}

/** Events persisted before stamps, each stamped `now`: the moment this device first knew it. */
export function upgradeLegacyEvents(events: LegacyUpcomingEvent[], now: Stamp): UpcomingEvents {
  return { events: events.map((e) => ({ ...e, updatedAt: now })), tombstones: {} };
}

/** Events from `fromDate` on, soonest first; same-day events alphabetical. */
export function upcomingEvents(events: UpcomingEvent[], fromDate: DayKey): UpcomingEvent[] {
  return events
    .filter((e) => e.date >= fromDate)
    .sort((a, b) =>
      a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? -1 : 1,
    );
}

/** Blank collapses to absent, so an empty time or note never renders as "@ ". */
function trimOptional(text: string | undefined): string | undefined {
  return text?.trim() || undefined;
}
