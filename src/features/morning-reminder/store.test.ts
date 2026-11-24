import { useMorningReminderStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useMorningReminderStore', () => {
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
});
