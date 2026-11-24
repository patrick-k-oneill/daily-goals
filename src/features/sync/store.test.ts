import { syncNow, useSyncStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = '2026-08-21T09:00:00.000Z';

// The engine is covered in engine.test.ts; this checks the React binding of its reports.
describe('useSyncStore', () => {
  it('follows the engine from syncing to synced, keeping the last good moment through a failure', () => {
    const { syncing, synced, failed, unavailable } = useSyncStore.getState();
    expect(useSyncStore.getState().phase).toBe('starting');

    syncing();
    expect(useSyncStore.getState().phase).toBe('syncing');

    synced(NOW);
    expect(useSyncStore.getState()).toMatchObject({ phase: 'synced', lastSyncedAt: NOW });

    failed('no container');
    expect(useSyncStore.getState()).toMatchObject({
      phase: 'error',
      problem: 'no container',
      lastSyncedAt: NOW,
    });

    unavailable();
    expect(useSyncStore.getState()).toMatchObject({ phase: 'unavailable', problem: null });
  });
});

describe('syncNow', () => {
  it('runs one pull outside an open pad and reports where it ended', async () => {
    useSyncStore.setState({ phase: 'starting' });
    expect(await syncNow()).toBe('unavailable');
    expect(useSyncStore.getState().phase).toBe('unavailable');
  });
});
