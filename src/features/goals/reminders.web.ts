import type { RemindersAccess } from './reminders';
import type { Reminder } from './types';

export type { RemindersAccess };

/** The browser has no Reminders app. */
export const hasReminders = false;

export async function requestRemindersAccess(): Promise<RemindersAccess> {
  return 'unavailable';
}

export async function readDueReminders(): Promise<Reminder[] | null> {
  return null;
}
