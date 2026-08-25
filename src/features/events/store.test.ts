import { useEventsStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The transitions are covered in logic.test.ts; this checks the React binding.
describe('useEventsStore', () => {
  beforeEach(() => useEventsStore.setState({ events: [] }));

  it('applies each action as a transition on the persisted state', () => {
    const { addEvent, updateEvent, removeEvent } = useEventsStore.getState();
    addEvent({ date: '2026-08-23', title: 'IRC', timeLabel: '4pm' });
    const [jotted] = useEventsStore.getState().events;
    expect(jotted).toMatchObject({ title: 'IRC', timeLabel: '4pm' });

    updateEvent(jotted.id, { note: 'omg lol' });
    expect(useEventsStore.getState().events[0].note).toBe('omg lol');

    removeEvent(jotted.id);
    expect(useEventsStore.getState().events).toHaveLength(0);
  });
});
