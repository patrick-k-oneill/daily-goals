import type { UpcomingEvent } from '@/features/events/types';
import type { Goals } from '@/features/goals/types';
import type { GratitudeEntries } from '@/features/gratitude/logic';

/** Everything on the pad, gathered from the three feature stores. */
export interface PadData {
  goals: Goals;
  gratitude: GratitudeEntries;
  events: UpcomingEvent[];
}

/** The pad file's envelope: the pad under a schema version, stamped with when it was exported. */
export interface PadFile extends PadData {
  schemaVersion: number;
  exportedAt: string;
}
