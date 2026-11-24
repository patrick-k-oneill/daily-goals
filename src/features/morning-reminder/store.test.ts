import { scheduleReminder } from './notifications';
import {
  disableMorningReminder,
  enableMorningReminder,
  moveMorningReminder,
  useMorningReminderStore,
} from './store';
import type { ScheduledReminder } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./notifications', () => ({
  requestNotificationsAccess: jest.fn(async () => 'granted'),
  readNotificationsAccess: jest.fn(async () => 'granted'),
  scheduleReminder: jest.fn(),
  onReminderTap: jest.fn(() => () => {}),
}));

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A stand-in device: scheduling cancels what is there, then adds the new one a moment later. */
function deviceSchedule({ canSchedule }: { canSchedule: boolean }) {
  const device: { scheduled: ScheduledReminder | null } = { scheduled: null };
  jest.mocked(scheduleReminder).mockImplementation(async (reminder) => {
    await tick();
    device.scheduled = null;
    if (!reminder) return true;
    await tick();
    if (!canSchedule) return false;
    device.scheduled = reminder;
    return true;
  });
  return device;
}

describe('useMorningReminderStore', () => {
  beforeEach(() => {
    useMorningReminderStore.setState({ isOn: false, time: { hour: 7, minute: 0 } });
  });

  it('starts off at seven and follows the switch and the time', () => {
    expect(useMorningReminderStore.getState()).toMatchObject({
      isOn: false,
      time: { hour: 7, minute: 0 },
    });

    useMorningReminderStore.getState().setOn(true);
    useMorningReminderStore.getState().setTime({ hour: 6, minute: 30 });
    expect(useMorningReminderStore.getState()).toMatchObject({
      isOn: true,
      time: { hour: 6, minute: 30 },
    });
  });

  it('leaves nothing scheduled when the switch goes off while a time change is still landing', async () => {
    const device = deviceSchedule({ canSchedule: true });
    expect(await enableMorningReminder()).toBe('on');
    expect(device.scheduled).toMatchObject({ hour: 7, minute: 0 });

    const moved = moveMorningReminder({ hour: 6, minute: 30 });
    const turnedOff = disableMorningReminder();
    await Promise.all([moved, turnedOff]);

    expect(useMorningReminderStore.getState().isOn).toBe(false);
    expect(device.scheduled).toBeNull();
  });

  it('turns the switch back off when the reminder cannot be scheduled', async () => {
    const device = deviceSchedule({ canSchedule: false });

    expect(await enableMorningReminder()).toBe('unavailable');

    expect(useMorningReminderStore.getState().isOn).toBe(false);
    expect(device.scheduled).toBeNull();
  });
});
