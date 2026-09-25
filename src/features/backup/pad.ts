import { useEventsStore } from '@/features/events/store';
import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';

import { storageFootprint, type StorageFootprint } from './footprint';
import type { PadData } from './types';

/** Everything the three stores hold right now, gathered as one pad. */
export function readPad(): PadData {
  const goals = useGoalsStore.getState();
  const gratitude = useGratitudeStore.getState();
  const events = useEventsStore.getState();
  return {
    goals: { templates: goals.templates, entries: goals.entries, tombstones: goals.tombstones },
    gratitude: { entries: gratitude.entries, tombstones: gratitude.tombstones },
    events: { events: events.events, tombstones: events.tombstones },
  };
}

/** Replace every page with an imported pad. Replace-all by design: merging belongs to sync. */
export function writePad(pad: PadData): void {
  useGoalsStore.getState().replaceGoals(pad.goals);
  useGratitudeStore.getState().replaceGratitude(pad.gratitude);
  useEventsStore.getState().replaceEvents(pad.events);
}

/** The pad's size on this device, re-measured whenever any store changes. */
export function useStorageFootprint(): StorageFootprint {
  const templates = useGoalsStore((s) => s.templates);
  const entries = useGoalsStore((s) => s.entries);
  const goalTombstones = useGoalsStore((s) => s.tombstones);
  const mornings = useGratitudeStore((s) => s.entries);
  const morningTombstones = useGratitudeStore((s) => s.tombstones);
  const events = useEventsStore((s) => s.events);
  const eventTombstones = useEventsStore((s) => s.tombstones);
  return storageFootprint({
    goals: { templates, entries, tombstones: goalTombstones },
    gratitude: { entries: mornings, tombstones: morningTombstones },
    events: { events, tombstones: eventTombstones },
  });
}
