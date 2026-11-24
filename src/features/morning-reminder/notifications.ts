import { Platform } from 'react-native';

import type { ScheduledReminder } from './types';

export type NotificationsAccess = 'granted' | 'denied' | 'unavailable';

/** Whether this platform can post a local notification. */
export const hasNotifications = Platform.OS === 'ios' || Platform.OS === 'android';

const REMINDER_ID = 'morning-reminder';

const loadNotifications = () => import('expo-notifications');

/** Ask to post notifications; iOS shows its prompt only the first time. */
export async function requestNotificationsAccess(): Promise<NotificationsAccess> {
  if (!hasNotifications) return 'unavailable';
  try {
    const Notifications = await loadNotifications();
    const { granted } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true },
    });
    return granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Whether notifications can be posted right now, without prompting. */
export async function readNotificationsAccess(): Promise<NotificationsAccess> {
  if (!hasNotifications) return 'unavailable';
  try {
    const Notifications = await loadNotifications();
    const { granted } = await Notifications.getPermissionsAsync();
    return granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * Make the device's schedule match: the one daily notification at its time, or
 * none. Resolves false when the reminder asked for could not be scheduled.
 */
export async function scheduleReminder(reminder: ScheduledReminder | null): Promise<boolean> {
  if (!hasNotifications) return reminder === null;
  try {
    const Notifications = await loadNotifications();
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    if (!reminder) return true;
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { body: reminder.body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Hear each tap on the reminder's notification. Returns the way to stop listening. */
export function onReminderTap(listener: () => void): () => void {
  if (!hasNotifications) return () => {};
  let isStopped = false;
  let stop = () => {
    isStopped = true;
  };
  loadNotifications()
    .then((Notifications) => {
      if (isStopped) return;
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        if (response.notification.request.identifier === REMINDER_ID) listener();
      });
      stop = () => subscription.remove();
    })
    .catch(() => {});
  return () => stop();
}
