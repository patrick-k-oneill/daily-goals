import AsyncStorage from '@react-native-async-storage/async-storage';

import { readDueReminders, requestRemindersAccess } from './reminders';
import {
  disableReminders,
  enableReminders,
  refreshReminders,
  useRemindersStore,
} from './reminders-store';
import type { Reminder } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./reminders', () => ({
  hasReminders: true,
  readDueReminders: jest.fn(),
  requestRemindersAccess: jest.fn(),
}));

const read = jest.mocked(readDueReminders);
const request = jest.mocked(requestRemindersAccess);

const list: Reminder[] = [
  { id: 'r1', title: 'Buy stamps', completed: false, dueDay: '2026-08-21' },
];

function state() {
  const { isEnabled, reminders } = useRemindersStore.getState();
  return { isEnabled, reminders };
}

describe('the Reminders switch', () => {
  beforeEach(() => {
    useRemindersStore.setState({ isEnabled: false, reminders: [] });
    read.mockReset();
    request.mockReset();
  });

  it('stays off, with nothing read, until access is given', async () => {
    request.mockResolvedValue('denied');
    expect(await enableReminders()).toBe('denied');
    expect(state()).toEqual({ isEnabled: false, reminders: [] });
    expect(read).not.toHaveBeenCalled();

    request.mockResolvedValue('unavailable');
    expect(await enableReminders()).toBe('unavailable');
    expect(state()).toEqual({ isEnabled: false, reminders: [] });
  });

  it('turns on with access and reads the due reminders', async () => {
    request.mockResolvedValue('granted');
    read.mockResolvedValue(list);
    expect(await enableReminders()).toBe('on');
    expect(state()).toEqual({ isEnabled: true, reminders: list });

    read.mockResolvedValue([]);
    expect(await refreshReminders()).toBe('on');
    expect(state()).toEqual({ isEnabled: true, reminders: [] });
  });

  it('keeps the list it holds when a read finds nothing new', async () => {
    useRemindersStore.setState({ isEnabled: true, reminders: list });
    read.mockResolvedValue(structuredClone(list));
    await refreshReminders();
    expect(useRemindersStore.getState().reminders).toBe(list);

    const changed = [{ ...list[0], dueDay: '2026-08-20' }];
    read.mockResolvedValue(changed);
    await refreshReminders();
    expect(useRemindersStore.getState().reminders).toBe(changed);
  });

  it('forgets the list when turned off, and drops a read that lands afterwards', async () => {
    useRemindersStore.setState({ isEnabled: true, reminders: list });
    read.mockImplementation(async () => {
      disableReminders();
      return list;
    });
    await refreshReminders();
    expect(state()).toEqual({ isEnabled: false, reminders: [] });

    read.mockClear();
    expect(await refreshReminders()).toBe('off');
    expect(read).not.toHaveBeenCalled();
  });

  it('turns itself off when Reminders can no longer be read', async () => {
    useRemindersStore.setState({ isEnabled: true, reminders: list });
    read.mockResolvedValue(null);
    expect(await refreshReminders()).toBe('unavailable');
    expect(state()).toEqual({ isEnabled: false, reminders: [] });
  });

  it('saves the switch and never the list', async () => {
    useRemindersStore.setState({ isEnabled: true, reminders: list });
    const saved = JSON.parse((await AsyncStorage.getItem('daily-goals/reminders')) ?? '{}');
    expect(saved.state).toEqual({ isEnabled: true });
  });
});
