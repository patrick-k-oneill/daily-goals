import type { Goals, LegacyGoals } from '@/features/goals/types';
import type { Gratitude, GratitudeEntries } from '@/features/gratitude/types';

/** Everything on the pad, gathered from the two feature stores. */
export interface PadData {
  goals: Goals;
  gratitude: Gratitude;
}

/** The pad file's envelope: the pad under a schema version, stamped with when it was exported. */
export interface PadFile extends PadData {
  schemaVersion: number;
  exportedAt: string;
}

/** What a schema 1 file holds: the pad before stamps and tombstones. */
export interface LegacyPadData {
  goals: LegacyGoals;
  gratitude: GratitudeEntries;
}
