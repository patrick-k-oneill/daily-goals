import AsyncStorage from '@react-native-async-storage/async-storage';

import { useEventsStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The transitions are covered in logic.test.ts; this checks the React binding.
describe('useEventsStore', () => {
  beforeEach(() => useEventsStore.setState({ events: [], tombstones: {} }));

  it('applies each action as a stamped transition on the persisted state', () => {
    const { addEvent, updateEvent, removeEvent } = useEventsStore.getState();
    addEvent({ date: '2026-08-23', title: 'IRC', timeLabel: '4pm' });
    const [jotted] = useEventsStore.getState().events;
    expect(jotted).toMatchObject({ title: 'IRC', timeLabel: '4pm' });
    expect(Date.parse(jotted.updatedAt)).not.toBeNaN();

    updateEvent(jotted.id, { note: 'omg lol' });
    expect(useEventsStore.getState().events[0].note).toBe('omg lol');

    removeEvent(jotted.id);
    expect(useEventsStore.getState().events).toHaveLength(0);
    expect(useEventsStore.getState().tombstones).toHaveProperty(jotted.id);
  });

  it('stamps events saved before stamps on rehydration', async () => {
    await AsyncStorage.setItem(
      'daily-goals/events',
      JSON.stringify({
        state: { events: [{ id: 'ev1', date: '2026-08-23', title: 'IRC' }] },
        version: 1,
      }),
    );
    await useEventsStore.persist.rehydrate();
    const [jotted] = useEventsStore.getState().events;
    expect(jotted).toMatchObject({ id: 'ev1', title: 'IRC' });
    expect(Date.parse(jotted.updatedAt)).not.toBeNaN();
    expect(useEventsStore.getState().tombstones).toEqual({});
  });

  it("merges another device's copy", () => {
    const remote = {
      id: 'ev9',
      date: '2026-08-23',
      title: 'IRC',
      updatedAt: '2026-08-21T09:00:00.000Z',
    };
    useEventsStore.getState().mergeEvents({ events: [remote], tombstones: {} });
    expect(useEventsStore.getState().events).toEqual([remote]);
  });
});
