import type { DayKey } from '@/lib/dates';
import type { Stamp, Tombstones } from '@/lib/merge';

/**
 * The morning ritual: each day's gratitude is written the next morning onto
 * the previous day's page. `forDate` is the day being reflected on.
 */
export interface GratitudeEntry {
  /** Day key of the day being appreciated — yesterday, at writing time. */
  forDate: DayKey;
  /** ISO timestamp of the last edit. */
  writtenAt: Stamp;
  text: string;
}

/** Every morning written, keyed by reflection date (ADR 0002). */
export type GratitudeEntries = Record<DayKey, GratitudeEntry>;

/** The journal: the mornings written and the pages torn out. */
export interface Gratitude {
  entries: GratitudeEntries;
  /** Torn-out mornings, by reflection date. */
  tombstones: Tombstones;
}
