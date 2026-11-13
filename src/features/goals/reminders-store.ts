import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';

import { readTodayList, requestRemindersAccess } from './reminders';
import type { Reminder } from './types';

interface RemindersState {
  /** Whether this device's Today list feeds suggestions. The only part that is persisted. */
  isEnabled: boolean;
  /** The Today list as last read from the device; empty while the switch is off. */
  reminders: Reminder[];
  setEnabled: (isEnabled: boolean) => void;
  /**
   * Takes a fresh read of the Today list. One that lands after the switch went
   * off is dropped, and one that matches the list held changes nothing.
   */
  setReminders: (reminders: Reminder[]) => void;
}

/** How often the Today list is read again while the app stays in front. */
const REFRESH_INTERVAL_MS = 60_000;

/**
 * This device's link to Reminders: a switch, off until turned on, and the
 * Today list as last read. It is no part of the pad (ADR 0011): the list is
 * read again on every launch and never saved, exported or merged.
 */
export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      isEnabled: false,
      reminders: [],
      setEnabled: (isEnabled) => set(isEnabled ? { isEnabled } : { isEnabled, reminders: [] }),
      setReminders: (reminders) => {
        const held = get();
        if (held.isEnabled && !isSameList(held.reminders, reminders)) set({ reminders });
      },
    }),
    persistOptions<RemindersState, Pick<RemindersState, 'isEnabled'>>('reminders', {
      partialize: ({ isEnabled }) => ({ isEnabled }),
    }),
  ),
);

/** How turning the switch on ended: on, on with no Today list to read, or refused. */
export type EnableOutcome = 'on' | 'no-list' | 'denied' | 'unavailable';

/**
 * Read the Today list into the store while the switch is on. A list that can
 * no longer be read (access withdrawn in Settings) turns the switch off.
 */
export async function refreshReminders(): Promise<EnableOutcome | 'off'> {
  if (!useRemindersStore.getState().isEnabled) return 'off';

  const list = await readTodayList();
  const { setEnabled, setReminders } = useRemindersStore.getState();
  if (list === null) {
    setEnabled(false);
    return 'unavailable';
  }
  setReminders(list.reminders);
  return list.hasList ? 'on' : 'no-list';
}

/** Turn the switch on: ask for access, and on a yes read the Today list. */
export async function enableReminders(): Promise<EnableOutcome> {
  const access = await requestRemindersAccess();
  if (access !== 'granted') return access;

  useRemindersStore.getState().setEnabled(true);
  const outcome = await refreshReminders();
  return outcome === 'off' ? 'on' : outcome;
}

export function disableReminders(): void {
  useRemindersStore.getState().setEnabled(false);
}

/**
 * Keep the Today list fresh while the switch is on: at launch, on each return
 * to the foreground, and every minute in front. Nothing announces a change
 * made in Reminders while the app stays active beside it (Split View, a Mac
 * window), so the list is read again on a timer.
 */
export function useRemindersRefresh() {
  const isEnabled = useRemindersStore((s) => s.isEnabled);

  useEffect(() => {
    if (!isEnabled) return;
    void refreshReminders();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshReminders();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshReminders();
    }, REFRESH_INTERVAL_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [isEnabled]);
}

function isSameList(a: Reminder[], b: Reminder[]): boolean {
  return (
    a.length === b.length &&
    a.every((r, i) => r.id === b[i].id && r.title === b[i].title && r.completed === b[i].completed)
  );
}
