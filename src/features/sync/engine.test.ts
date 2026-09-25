import type { PadData } from '@/features/backup/types';
import { useEventsStore } from '@/features/events/store';
import { materializeToday, seedGoals } from '@/features/goals/logic';
import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';
import { todayKey } from '@/lib/dates';

import { startSync, type SyncReporter } from './engine';
import { splitPad } from './logic';
import type { CloudBinding, CloudEvent, CloudFiles, SyncPhase } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = '2026-08-21T09:00:00.000Z';
const YEAR = todayKey().slice(0, 4);

function fakeCloud(files: CloudFiles = {}) {
  const listeners = new Set<(event: CloudEvent) => void>();
  const device = { files, available: true, writes: [] as string[] };
  const binding: CloudBinding = {
    isAvailable: async () => device.available,
    start: async () => {},
    stop: () => {},
    readAll: async () => ({ files: { ...device.files }, skipped: [] }),
    write: async (path, text) => {
      device.files[path] = text;
      device.writes.push(path);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  const emit = (event: CloudEvent) => listeners.forEach((listener) => listener(event));
  return Object.assign(device, { binding, emit });
}

function recorder() {
  const phases: SyncPhase[] = [];
  const reporter: SyncReporter = {
    syncing: () => phases.push('syncing'),
    synced: () => phases.push('synced'),
    unavailable: () => phases.push('unavailable'),
    failed: () => phases.push('error'),
  };
  return { phases, reporter };
}

function padWith(overrides: Partial<PadData>): PadData {
  return {
    goals: { templates: [], entries: [], tombstones: {} },
    gratitude: { entries: {}, tombstones: {} },
    events: { events: [], tombstones: {} },
    ...overrides,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

// The layout is covered in logic.test.ts; this checks the wiring to the stores and the device.
describe('startSync', () => {
  let stop = () => {};

  beforeEach(() => {
    useGoalsStore.setState(materializeToday(seedGoals(), todayKey()));
    useGratitudeStore.setState({ entries: {}, tombstones: {} });
    useEventsStore.setState({ events: [], tombstones: {} });
  });

  afterEach(() => stop());

  it('pulls the cloud pad into the stores at start, then pushes what the cloud lacks', async () => {
    const cloud = fakeCloud(
      splitPad(
        padWith({
          goals: {
            templates: [
              {
                id: 'c1',
                cadence: 'daily',
                title: 'Cloud',
                targetCount: 1,
                sortOrder: 9,
                updatedAt: NOW,
              },
            ],
            entries: [],
            tombstones: {},
          },
        }),
      ),
    );
    const { phases, reporter } = recorder();
    stop = startSync(cloud.binding, reporter, { pushDelayMs: 5, pullDelayMs: 5 });
    await settle();

    expect(useGoalsStore.getState().templates.map((t) => t.title)).toContain('Cloud');
    expect(cloud.writes.sort()).toEqual([`goals/entries-${YEAR}.json`, 'goals/index.json']);
    expect(phases.at(-1)).toBe('synced');
  });

  it('pushes a local write after a pause, and only the file it changed', async () => {
    const cloud = fakeCloud();
    stop = startSync(cloud.binding, recorder().reporter, { pushDelayMs: 5, pullDelayMs: 5 });
    await settle();
    cloud.writes.length = 0;

    useGoalsStore.getState().cycleCheck(`seed:daily:1:${todayKey()}`, 0);
    await settle();
    expect(cloud.writes).toEqual([`goals/entries-${YEAR}.json`]);
  });

  it("pulls another device's write when the cloud says something changed", async () => {
    const cloud = fakeCloud();
    stop = startSync(cloud.binding, recorder().reporter, { pushDelayMs: 5, pullDelayMs: 5 });
    await settle();

    Object.assign(
      cloud.files,
      splitPad(
        padWith({
          gratitude: {
            entries: { '2026-08-20': { forDate: '2026-08-20', writtenAt: NOW, text: 'Amy' } },
            tombstones: {},
          },
        }),
      ),
    );
    cloud.emit('changed');
    await settle();
    expect(useGratitudeStore.getState().entries['2026-08-20']?.text).toBe('Amy');
  });

  it('rests without writing while iCloud is unavailable', async () => {
    const cloud = fakeCloud();
    cloud.available = false;
    const { phases, reporter } = recorder();
    stop = startSync(cloud.binding, reporter, { pushDelayMs: 5, pullDelayMs: 5 });
    await settle();
    useGoalsStore.getState().cycleCheck(`seed:daily:1:${todayKey()}`, 0);
    await settle();

    expect(phases).toEqual(['unavailable', 'unavailable']);
    expect(cloud.writes).toEqual([]);
  });
});
