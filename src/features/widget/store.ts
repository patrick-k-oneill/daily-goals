import { useEffect } from 'react';
import { Linking } from 'react-native';

import { useGoalsStore } from '@/features/goals/store';
import { useToday } from '@/lib/clock';
import type { DayKey } from '@/lib/dates';

import { isWidgetLink, snapshotTimeline } from './logic';
import { hasWidget, publishTimeline } from './publish';

/** How long the pad rests after a write before the widget is told. */
const PUBLISH_DELAY_MS = 500;

function publishPad(today: DayKey) {
  const { templates, entries, tombstones } = useGoalsStore.getState();
  void publishTimeline(snapshotTimeline({ templates, entries, tombstones }, today, new Date()));
}

/** Publish the pad now and after each write to the goals, once it has rested. Returns the way to stop. */
function keepWidgetCurrent(today: DayKey): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  publishPad(today);
  const unsubscribe = useGoalsStore.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(() => publishPad(today), PUBLISH_DELAY_MS);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

/**
 * Keep the Home Screen widget's timeline true to the pad: published once the
 * pad has rehydrated, after each write to the goals, and when the day turns.
 */
export function useTodayWidget(ready: boolean) {
  const today = useToday();

  useEffect(() => {
    if (!ready || !hasWidget) return;
    return keepWidgetCurrent(today);
  }, [ready, today]);
}

/** Run `onTap` whenever the widget is tapped while the app is alive; a cold start opens on today as it is. */
export function useTodayWidgetTap(onTap: () => void) {
  useEffect(() => {
    if (!hasWidget) return;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isWidgetLink(url)) onTap();
    });
    return () => subscription.remove();
  }, [onTap]);
}
