import { Platform } from 'react-native';

import { addDays, dayKeyOf, parseDayKey, todayKey } from '@/lib/dates';

import type { Reminder } from './types';

export type RemindersAccess = 'granted' | 'denied' | 'unavailable';

/** Whether this platform has a Reminders app to read. */
export const hasReminders = Platform.OS === 'ios';

// Loaded on first use, never at startup: requiring the module throws in a build made without it.
const loadCalendar = () => import('expo-calendar');

/** Ask for access to Reminders; iOS shows its prompt only the first time. */
export async function requestRemindersAccess(): Promise<RemindersAccess> {
  if (!hasReminders) return 'unavailable';
  try {
    const Calendar = await loadCalendar();
    const { granted } = await Calendar.requestRemindersPermissions();
    return granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * Read the due reminders without prompting. Null when Reminders can't be read
 * at all: no access, or a build without the module.
 */
export async function readDueReminders(): Promise<Reminder[] | null> {
  if (!hasReminders) return null;
  try {
    const Calendar = await loadCalendar();
    const { granted } = await Calendar.getRemindersPermissions();
    if (!granted) return null;

    const endOfToday = new Date(parseDayKey(addDays(todayKey(), 1)).getTime() - 1);
    const lists = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER);
    const unfinished = await Promise.all(
      lists.map((list) => list.listReminders(null, endOfToday, Calendar.ReminderStatus.INCOMPLETE)),
    );
    return unfinished.flat().flatMap(({ id, title, completed, dueDate }) =>
      id
        ? [
            {
              id,
              title: title ?? '',
              completed: Boolean(completed),
              ...(dueDate ? { dueDay: dayKeyOf(new Date(dueDate)) } : {}),
            },
          ]
        : [],
    );
  } catch {
    return null;
  }
}
