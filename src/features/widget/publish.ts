import { Platform } from 'react-native';

import type { SnapshotEntry } from './types';

/** Whether this platform has a Home Screen widget to publish to. */
export const hasWidget = Platform.OS === 'ios';

const loadWidget = () => import('./components/today-goals-widget');

/** Hand the widget its timeline; iOS redraws it when it next chooses to. */
export async function publishTimeline(timeline: SnapshotEntry[]): Promise<void> {
  if (!hasWidget) return;
  try {
    const { default: TodayGoals } = await loadWidget();
    TodayGoals.updateTimeline(timeline);
  } catch {
    return;
  }
}
