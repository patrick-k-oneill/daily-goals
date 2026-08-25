import { useGratitudeStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('saveEntry', () => {
  beforeEach(() => {
    useGratitudeStore.setState({ entries: {} });
  });

  it('keeps only the latest of sequential saves for the same date', () => {
    useGratitudeStore.getState().saveEntry('2026-08-21', 'first draft');
    useGratitudeStore.getState().saveEntry('2026-08-21', 'second draft');
    expect(useGratitudeStore.getState().entries['2026-08-21'].text).toBe('second draft');
  });

  it('removes the entry when the text is emptied', () => {
    useGratitudeStore.getState().saveEntry('2026-08-21', 'something');
    useGratitudeStore.getState().saveEntry('2026-08-21', '');
    expect(useGratitudeStore.getState().entries['2026-08-21']).toBeUndefined();

    useGratitudeStore.getState().saveEntry('2026-08-21', 'again');
    useGratitudeStore.getState().saveEntry('2026-08-21', '   ');
    expect(useGratitudeStore.getState().entries['2026-08-21']).toBeUndefined();
  });

  it('keeps other dates untouched', () => {
    useGratitudeStore.getState().saveEntry('2026-08-20', 'kept');
    useGratitudeStore.getState().saveEntry('2026-08-21', 'new');
    useGratitudeStore.getState().saveEntry('2026-08-21', '');
    expect(useGratitudeStore.getState().entries['2026-08-20'].text).toBe('kept');
  });
});
