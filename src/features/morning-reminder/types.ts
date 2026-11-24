/** A time of day on this device's clock. */
export interface ReminderTime {
  hour: number;
  minute: number;
}

/** This device's morning reminder. It is in no pad file and is never merged. */
export interface MorningReminder {
  isOn: boolean;
  time: ReminderTime;
}

/** The daily notification the device keeps scheduled while the reminder is on. */
export interface ScheduledReminder extends ReminderTime {
  body: string;
}
