import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';

import type { PadData } from './types';

/** Everything the two stores hold right now, gathered as one pad. */
export function readPad(): PadData {
  const goals = useGoalsStore.getState();
  const gratitude = useGratitudeStore.getState();
  return {
    goals: { templates: goals.templates, entries: goals.entries, tombstones: goals.tombstones },
    gratitude: { entries: gratitude.entries, tombstones: gratitude.tombstones },
  };
}

/** Replace every page with an imported pad. Replace-all by design: merging belongs to sync. */
export function writePad(pad: PadData): void {
  useGoalsStore.getState().replaceGoals(pad.goals);
  useGratitudeStore.getState().replaceGratitude(pad.gratitude);
}
