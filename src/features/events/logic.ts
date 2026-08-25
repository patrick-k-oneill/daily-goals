import type { DayKey } from '@/lib/dates';
import { newId } from '@/lib/id';

import type { UpcomingEvent } from './types';

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
export function addEvent(events: UpcomingEvent[], input: EventInput): UpcomingEvent[] {
  const title = input.title.trim();
  if (!title) return events;
  return [
    ...events,
    {
      id: newId(),
      date: input.date,
      title,
      timeLabel: trimOptional(input.timeLabel),
      note: trimOptional(input.note),
    },
  ];
}

/**
 * Update one event in place, trimming like addEvent. A patch that blanks the
 * title is rejected wholesale (events always keep a title) and returns the
 * input untouched, as does an unknown id.
 */
export function updateEvent(
  events: UpcomingEvent[],
  id: string,
  patch: EventPatch,
): UpcomingEvent[] {
  const title = patch.title?.trim();
  if (patch.title !== undefined && !title) return events;
  if (!events.some((e) => e.id === id)) return events;

  return events.map((e) =>
    e.id === id
      ? {
          ...e,
          date: patch.date ?? e.date,
          title: title ?? e.title,
          timeLabel: patch.timeLabel === undefined ? e.timeLabel : trimOptional(patch.timeLabel),
          note: patch.note === undefined ? e.note : trimOptional(patch.note),
        }
      : e,
  );
}

export function removeEvent(events: UpcomingEvent[], id: string): UpcomingEvent[] {
  if (!events.some((e) => e.id === id)) return events;
  return events.filter((e) => e.id !== id);
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
