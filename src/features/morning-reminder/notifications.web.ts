import type { NotificationsAccess } from './notifications';
import type { ScheduledReminder } from './types';

export type { NotificationsAccess };

/** The web pad posts no notifications. */
export const hasNotifications = false;

export async function requestNotificationsAccess(): Promise<NotificationsAccess> {
  return 'unavailable';
}

export async function readNotificationsAccess(): Promise<NotificationsAccess> {
  return 'unavailable';
}

export async function scheduleReminder(reminder: ScheduledReminder | null): Promise<boolean> {
  return reminder === null;
}

export function onReminderTap(_listener: () => void): () => void {
  return () => {};
}
