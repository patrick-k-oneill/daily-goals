import { Platform } from 'react-native';

import { isTodayList } from './logic';
import type { Reminder } from './types';

export type RemindersAccess = 'granted' | 'denied' | 'unavailable';

/** What one read of the device's Today list found. */
export interface TodayList {
  /** False when Reminders has no list named Today. */
  hasList: boolean;
  /** The unfinished reminders of every list named Today. */
  reminders: Reminder[];
}

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
 * Read the Today list without prompting. Null when Reminders can't be read
 * at all: no access, or a build without the module.
 */
export async function readTodayList(): Promise<TodayList | null> {
  if (!hasReminders) return null;
  try {
    const Calendar = await loadCalendar();
    const { granted } = await Calendar.getRemindersPermissions();
    if (!granted) return null;

    const lists = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER);
    const todayLists = lists.filter((list) => isTodayList(list.title));
    const unfinished = await Promise.all(
      todayLists.map((list) => list.listReminders(null, null, Calendar.ReminderStatus.INCOMPLETE)),
    );
    const reminders = unfinished
      .flat()
      .flatMap(({ id, title, completed }) =>
        id ? [{ id, title: title ?? '', completed: Boolean(completed) }] : [],
      );
    return { hasList: todayLists.length > 0, reminders };
  } catch {
    return null;
  }
}
