import {
  dateAt,
  DEFAULT_REMINDER_TIME,
  formatReminderTime,
  initialReminder,
  REMINDER_BODY,
  scheduledReminder,
  timeOfDay,
  turnedOff,
  turnedOn,
  validReminder,
  withTime,
} from './logic';

describe('the morning reminder', () => {
  it('starts off, set for seven in the morning', () => {
    expect(initialReminder()).toEqual({ isOn: false, time: { hour: 7, minute: 0 } });
    expect(scheduledReminder(initialReminder())).toBeNull();
  });

  it('schedules one notification a day at its time once it is on, and none once it is off', () => {
    const on = withTime(turnedOn(initialReminder()), { hour: 6, minute: 30 });
    expect(scheduledReminder(on)).toEqual({ hour: 6, minute: 30, body: REMINDER_BODY });
    expect(REMINDER_BODY).toBe('Yesterday’s gratitude, today’s goals');
    expect(scheduledReminder(turnedOff(on))).toBeNull();
  });

  it('keeps its time while it is off, and changes nothing when told what it already holds', () => {
    const off = withTime(initialReminder(), { hour: 8, minute: 15 });
    expect(turnedOn(off).time).toEqual({ hour: 8, minute: 15 });

    const on = turnedOn(off);
    expect(turnedOn(on)).toBe(on);
    expect(turnedOff(off)).toBe(off);
    expect(withTime(on, { hour: 8, minute: 15 })).toBe(on);
  });

  it('brings a time off the clock back onto it', () => {
    const start = initialReminder();
    expect(withTime(start, { hour: 24, minute: 75 }).time).toEqual({ hour: 23, minute: 59 });
    expect(withTime(start, { hour: -1, minute: -5 }).time).toEqual({ hour: 0, minute: 0 });
    expect(withTime(start, { hour: 6.9, minute: 30.2 }).time).toEqual({ hour: 6, minute: 30 });
  });

  it('reads a time of day off a date and puts it back on one', () => {
    const picked = new Date(2026, 7, 21, 6, 45);
    expect(timeOfDay(picked)).toEqual({ hour: 6, minute: 45 });
    expect(dateAt({ hour: 6, minute: 45 }, new Date(2026, 7, 21, 23, 59))).toEqual(picked);
  });

  it('formats its time the way the device does', () => {
    expect(formatReminderTime(DEFAULT_REMINDER_TIME)).toMatch(/^0?7:00/);
  });

  it('falls back to its default for whatever storage holds out of shape', () => {
    expect(validReminder(undefined)).toEqual(initialReminder());
    expect(validReminder({ isOn: 'yes', time: { hour: '7' } })).toEqual(initialReminder());
    expect(validReminder({ isOn: true, time: { hour: 30, minute: 5 } })).toEqual({
      isOn: true,
      time: { hour: 23, minute: 5 },
    });
  });
});
