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

export async function scheduleReminder(_reminder: ScheduledReminder | null): Promise<void> {}

export function onReminderTap(_listener: () => void): () => void {
  return () => {};
}
