import { isBoolean, isNumber, isRecord } from '@/lib/guards';

import type { MorningReminder, ReminderTime, ScheduledReminder } from './types';

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 7, minute: 0 };
export const REMINDER_BODY = 'Yesterday’s gratitude, today’s goals';

/** The reminder as a device first holds it: off, set for seven. */
export function initialReminder(): MorningReminder {
  return { isOn: false, time: DEFAULT_REMINDER_TIME };
}

export function turnedOn(reminder: MorningReminder): MorningReminder {
  return reminder.isOn ? reminder : { ...reminder, isOn: true };
}

export function turnedOff(reminder: MorningReminder): MorningReminder {
  return reminder.isOn ? { ...reminder, isOn: false } : reminder;
}

/** Move the reminder to another time of day; a time off the clock is brought onto it. */
export function withTime(reminder: MorningReminder, time: ReminderTime): MorningReminder {
  const fitted = fitTime(time);
  const isSame = fitted.hour === reminder.time.hour && fitted.minute === reminder.time.minute;
  return isSame ? reminder : { ...reminder, time: fitted };
}

/** What the device should keep scheduled: one notification a day, or nothing while the reminder is off. */
export function scheduledReminder(reminder: MorningReminder): ScheduledReminder | null {
  return reminder.isOn ? { ...reminder.time, body: REMINDER_BODY } : null;
}

/** The time of day a date falls at on this device. */
export function timeOfDay(date: Date): ReminderTime {
  return { hour: date.getHours(), minute: date.getMinutes() };
}

/** That time of day on the given date, for a picker that speaks in dates. */
export function dateAt(time: ReminderTime, day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hour, time.minute);
}

/** "7:00 AM", in the device's own format. */
export function formatReminderTime(time: ReminderTime): string {
  return dateAt(time, new Date(2026, 0, 1)).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** The reminder as it comes back from storage: anything out of shape falls back to its default. */
export function validReminder(value: unknown): MorningReminder {
  const initial = initialReminder();
  if (!isRecord(value)) return initial;
  const { isOn, time } = value;
  return {
    isOn: isBoolean(isOn) ? isOn : initial.isOn,
    time:
      isRecord(time) && isNumber(time.hour) && isNumber(time.minute)
        ? fitTime({ hour: time.hour, minute: time.minute })
        : initial.time,
  };
}

function fitTime({ hour, minute }: ReminderTime): ReminderTime {
  return { hour: clamp(Math.floor(hour), 23), minute: clamp(Math.floor(minute), 59) };
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}
