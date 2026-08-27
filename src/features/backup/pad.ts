import { useEventsStore } from '@/features/events/store';
import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';

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
