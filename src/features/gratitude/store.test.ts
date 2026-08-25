import { useGratitudeStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The transitions are covered in logic.test.ts; this checks the React binding.
describe('useGratitudeStore', () => {
  beforeEach(() => useGratitudeStore.setState({ entries: {} }));

  it('saves through the transition and stamps the writing time', () => {
    useGratitudeStore.getState().saveEntry('2026-08-21', 'grateful');
    const saved = useGratitudeStore.getState().entries['2026-08-21'];
    expect(saved.text).toBe('grateful');
    expect(Date.parse(saved.writtenAt)).not.toBeNaN();

    useGratitudeStore.getState().saveEntry('2026-08-21', '');
    expect(useGratitudeStore.getState().entries['2026-08-21']).toBeUndefined();
  });
});
