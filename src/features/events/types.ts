import type { DayKey } from '@/lib/dates';
import type { Stamp, Tombstones } from '@/lib/merge';

/** A jotted calendar note, like "Sun 8/23: IRC @ 4pm–5:30pm". */
export interface UpcomingEvent {
  id: string;
  /** Day key of the event. */
  date: DayKey;
  title: string;
  /** Freeform, the way it's written on the pad: "4pm–5:30pm". */
  timeLabel?: string;
  /** The aside scribbled above the entry — "omg lol". */
  note?: string;
  updatedAt: Stamp;
}

/** The bottom of the page: every event jotted, and the ones scratched out. */
export interface UpcomingEvents {
  events: UpcomingEvent[];
  /** Scratched-out events, by id. */
  tombstones: Tombstones;
}

/** The shape before stamps (store v1, pad file v1). */
export type LegacyUpcomingEvent = Omit<UpcomingEvent, 'updatedAt'>;
