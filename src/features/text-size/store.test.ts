import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTextSizeStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The steps are covered in logic.test.ts; this checks the React binding.
describe('useTextSizeStore', () => {
  beforeEach(() => useTextSizeStore.setState({ scale: 1 }));

  it('steps the text size through the ladder and rehydrates it from its own key', async () => {
    const { enlargeText, shrinkText, resetTextSize } = useTextSizeStore.getState();
    enlargeText();
    enlargeText();
    expect(useTextSizeStore.getState().scale).toBe(1.3);
    shrinkText();
    expect(useTextSizeStore.getState().scale).toBe(1.15);
    resetTextSize();
    expect(useTextSizeStore.getState().scale).toBe(1);

    await AsyncStorage.setItem(
      'daily-goals/text-size',
      JSON.stringify({ state: { scale: 1.5 }, version: 1 }),
    );
    await useTextSizeStore.persist.rehydrate();
    expect(useTextSizeStore.getState().scale).toBe(1.5);
  });

  it('reads a saved size that is no size as 100%', async () => {
    await AsyncStorage.setItem(
      'daily-goals/text-size',
      JSON.stringify({ state: { scale: 0 }, version: 1 }),
    );
    await useTextSizeStore.persist.rehydrate();
    expect(useTextSizeStore.getState().scale).toBe(1);
    expect(typeof useTextSizeStore.getState().enlargeText).toBe('function');
  });
});
