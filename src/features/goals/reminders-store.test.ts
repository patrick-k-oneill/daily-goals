import AsyncStorage from '@react-native-async-storage/async-storage';

import { readTodayList, requestRemindersAccess } from './reminders';
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
  readTodayList: jest.fn(),
  requestRemindersAccess: jest.fn(),
}));

const read = jest.mocked(readTodayList);
const request = jest.mocked(requestRemindersAccess);

const list: Reminder[] = [{ id: 'r1', title: 'Buy stamps', completed: false }];

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

  it('turns on with access and reads the Today list, saying when there is none', async () => {
    request.mockResolvedValue('granted');
    read.mockResolvedValue({ hasList: true, reminders: list });
    expect(await enableReminders()).toBe('on');
    expect(state()).toEqual({ isEnabled: true, reminders: list });

    read.mockResolvedValue({ hasList: false, reminders: [] });
    expect(await refreshReminders()).toBe('no-list');
    expect(state()).toEqual({ isEnabled: true, reminders: [] });
  });

  it('keeps the list it holds when a read finds nothing new', async () => {
    useRemindersStore.setState({ isEnabled: true, reminders: list });
    read.mockResolvedValue({ hasList: true, reminders: structuredClone(list) });
    await refreshReminders();
    expect(useRemindersStore.getState().reminders).toBe(list);

    const changed = [{ ...list[0], title: 'Buy envelopes' }];
    read.mockResolvedValue({ hasList: true, reminders: changed });
    await refreshReminders();
    expect(useRemindersStore.getState().reminders).toBe(changed);
  });

  it('forgets the list when turned off, and drops a read that lands afterwards', async () => {
    useRemindersStore.setState({ isEnabled: true, reminders: list });
    read.mockImplementation(async () => {
      disableReminders();
      return { hasList: true, reminders: list };
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
