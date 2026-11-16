import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTextSizeStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useTextSizeStore', () => {
  beforeEach(() => useTextSizeStore.setState({ zoom: 1 }));

  it('steps the zoom along the ladder and rehydrates it from its own key', async () => {
    const { zoomIn, zoomOut } = useTextSizeStore.getState();
    zoomIn();
    zoomIn();
    expect(useTextSizeStore.getState().zoom).toBe(1.3);
    zoomOut();
    expect(useTextSizeStore.getState().zoom).toBe(1.15);

    await AsyncStorage.setItem(
      'daily-goals/text-size',
      JSON.stringify({ state: { zoom: 1.5 }, version: 1 }),
    );
    await useTextSizeStore.persist.rehydrate();
    expect(useTextSizeStore.getState().zoom).toBe(1.5);
  });

  it('reads a saved zoom that is no size as 100%', async () => {
    await AsyncStorage.setItem(
      'daily-goals/text-size',
      JSON.stringify({ state: { zoom: 0 }, version: 1 }),
    );
    await useTextSizeStore.persist.rehydrate();
    expect(useTextSizeStore.getState().zoom).toBe(1);
    expect(typeof useTextSizeStore.getState().zoomIn).toBe('function');
  });
});
