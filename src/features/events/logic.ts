import type { DayKey } from '@/lib/dates';

import type { UpcomingEvent } from './types';

export interface EventPatch {
  date?: DayKey;
  title?: string;
  timeLabel?: string;
  note?: string;
}

/** addEvent's trimming rule for optional fields: blank collapses to undefined. */
export function trimOptional(text: string | undefined): string | undefined {
  return text?.trim() || undefined;
}

/**
 * Update one event in place, trimming like addEvent. A patch that blanks the
 * title is rejected wholesale (events always keep a title) and returns the
 * input array untouched, as do unknown ids.
 */
export function applyEventUpdate(
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
