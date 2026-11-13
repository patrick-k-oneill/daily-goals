import type { RemindersAccess, TodayList } from './reminders';

export type { RemindersAccess, TodayList };

/** The browser has no Reminders app. */
export const hasReminders = false;

export async function requestRemindersAccess(): Promise<RemindersAccess> {
  return 'unavailable';
}

export async function readTodayList(): Promise<TodayList | null> {
  return null;
}
