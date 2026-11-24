import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';
import {
  onReminderTap,
  readNotificationsAccess,
  requestNotificationsAccess,
  scheduleReminder,
} from './notifications';
import type { MorningReminder, ReminderTime } from './types';

interface MorningReminderState extends MorningReminder {
  setOn: (isOn: boolean) => void;
  setTime: (time: ReminderTime) => void;
}

/**
 * This device's morning reminder: a switch, off until turned on, and a time.
 * It is no part of the pad: never exported, synced or merged, since each
 * device asks for its own leave to notify.
 */
export const useMorningReminderStore = create<MorningReminderState>()(
  persist(
    (set) => ({
      ...logic.initialReminder(),
      setOn: (isOn) => set((r) => (isOn ? logic.turnedOn(r) : logic.turnedOff(r))),
      setTime: (time) => set((r) => logic.withTime(r, time)),
    }),
    persistOptions<MorningReminderState, MorningReminder>('morning-reminder', {
      partialize: ({ isOn, time }) => ({ isOn, time }),
      merge: (persisted, current) => ({ ...current, ...logic.validReminder(persisted) }),
    }),
  ),
);

/** How turning the reminder on ended: on, or refused. */
export type EnableOutcome = 'on' | 'denied' | 'unavailable';

let scheduling: Promise<boolean> = Promise.resolve(true);

/**
 * Bring the device's schedule to what the store holds when its turn comes, one
 * change at a time, so an earlier change cannot land after a later one. A
 * reminder that could not be scheduled turns the switch back off.
 */
function scheduleHeld(): Promise<boolean> {
  scheduling = scheduling.then(async () => {
    const isScheduled = await scheduleReminder(
      logic.scheduledReminder(useMorningReminderStore.getState()),
    );
    if (!isScheduled) useMorningReminderStore.getState().setOn(false);
    return isScheduled;
  });
  return scheduling;
}

/** Turn the reminder on: ask to notify, and on a yes schedule it. */
export async function enableMorningReminder(): Promise<EnableOutcome> {
  const access = await requestNotificationsAccess();
  if (access !== 'granted') return access;

  useMorningReminderStore.getState().setOn(true);
  return (await scheduleHeld()) ? 'on' : 'unavailable';
}

export async function disableMorningReminder(): Promise<void> {
  useMorningReminderStore.getState().setOn(false);
  await scheduleHeld();
}

export async function moveMorningReminder(time: ReminderTime): Promise<EnableOutcome> {
  useMorningReminderStore.getState().setTime(time);
  return (await scheduleHeld()) ? 'on' : 'unavailable';
}

/**
 * Keep the device's schedule true to the switch from launch on: a reminder
 * left on is scheduled again, and one whose leave to notify was withdrawn in
 * Settings is turned off.
 */
export function useMorningReminderSchedule(ready: boolean) {
  useEffect(() => {
    if (!ready || !useMorningReminderStore.getState().isOn) return;
    readNotificationsAccess()
      .then<unknown>((access) => (access === 'granted' ? scheduleHeld() : disableMorningReminder()))
      .catch(() => {});
  }, [ready]);
}

/** Run `onTap` whenever the reminder's notification is tapped. */
export function useMorningReminderTap(onTap: () => void) {
  useEffect(() => onReminderTap(onTap), [onTap]);
}
