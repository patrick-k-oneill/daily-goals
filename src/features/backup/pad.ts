import { useEventsStore } from '@/features/events/store';
import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';

import { storageFootprint, type StorageFootprint } from './footprint';
import type { PadData } from './types';

/** Everything the three stores hold right now, gathered as one pad. */
export function readPad(): PadData {
  const { templates, entries } = useGoalsStore.getState();
  return {
    goals: { templates, entries },
    gratitude: useGratitudeStore.getState().entries,
    events: useEventsStore.getState().events,
  };
}

/** Replace every page with an imported pad. Replace-all by design: merging belongs to sync. */
export function writePad(pad: PadData): void {
  useGoalsStore.getState().replaceGoals(pad.goals);
  useGratitudeStore.getState().replaceEntries(pad.gratitude);
  useEventsStore.getState().replaceEvents(pad.events);
}

/** The pad's size on this device, re-measured whenever any store changes. */
export function useStorageFootprint(): StorageFootprint {
  const templates = useGoalsStore((s) => s.templates);
  const entries = useGoalsStore((s) => s.entries);
  const gratitude = useGratitudeStore((s) => s.entries);
  const events = useEventsStore((s) => s.events);
  return storageFootprint({ goals: { templates, entries }, gratitude, events });
}
