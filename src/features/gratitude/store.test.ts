import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGratitudeStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const morning = { forDate: '2026-08-21', writtenAt: '2026-08-22T07:00:00.000Z', text: 'grateful' };

// The transitions are covered in logic.test.ts; this checks the React binding.
describe('useGratitudeStore', () => {
  beforeEach(() => useGratitudeStore.setState({ entries: {}, tombstones: {} }));

  it('saves through the transition and stamps the writing time', () => {
    useGratitudeStore.getState().saveEntry('2026-08-21', 'grateful');
    const saved = useGratitudeStore.getState().entries['2026-08-21'];
    expect(saved.text).toBe('grateful');
    expect(Date.parse(saved.writtenAt)).not.toBeNaN();

    useGratitudeStore.getState().saveEntry('2026-08-21', '');
    expect(useGratitudeStore.getState().entries['2026-08-21']).toBeUndefined();
    expect(useGratitudeStore.getState().tombstones).toHaveProperty('2026-08-21');
  });

  it('gives a journal saved before tombstones an empty set on rehydration', async () => {
    await AsyncStorage.setItem(
      'daily-goals/gratitude',
      JSON.stringify({ state: { entries: { '2026-08-21': morning } }, version: 1 }),
    );
    await useGratitudeStore.persist.rehydrate();
    expect(useGratitudeStore.getState().entries['2026-08-21']).toEqual(morning);
    expect(useGratitudeStore.getState().tombstones).toEqual({});
  });

  it("merges another device's copy", () => {
    useGratitudeStore
      .getState()
      .mergeGratitude({ entries: { '2026-08-21': morning }, tombstones: {} });
    expect(useGratitudeStore.getState().entries['2026-08-21']).toEqual(morning);
  });
});
