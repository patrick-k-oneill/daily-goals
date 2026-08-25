import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { todayKey, type DayKey } from './dates';

/** Milliseconds from `now` until the next local midnight. */
export function msUntilNextMidnight(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime();
}

const listeners = new Set<() => void>();
let midnightTimer: ReturnType<typeof setTimeout> | undefined;
let foregroundSubscription: { remove(): void } | undefined;

function notify() {
  armMidnightTimer();
  listeners.forEach((listener) => listener());
}

function armMidnightTimer() {
  clearTimeout(midnightTimer);
  // A few ms past midnight so the snapshot never lands on the old day.
  midnightTimer = setTimeout(notify, msUntilNextMidnight(new Date()) + 50);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    armMidnightTimer();
    foregroundSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') notify();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(midnightTimer);
      foregroundSubscription?.remove();
    }
  };
}

/**
 * The current local day key, kept live: re-renders at midnight and whenever
 * the app returns to the foreground, so "today" never goes stale on screen.
 */
export function useToday(): DayKey {
  return useSyncExternalStore(subscribe, todayKey, todayKey);
}
