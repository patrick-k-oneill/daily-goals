import AsyncStorage from '@react-native-async-storage/async-storage';

import { todayKey } from '@/lib/dates';
import { EPOCH } from '@/lib/merge';

import { SETTLE_MS } from './logic';
import { useRewardsStore } from './rewards-store';
import { useGoalsStore } from './store';
import type { GoalEntry } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function lastGoal(): GoalEntry {
  return {
    id: 'last',
    cadence: 'daily',
    periodKey: todayKey(),
    title: 'Last goal',
    checks: ['empty'],
    sortOrder: 1,
    updatedAt: EPOCH,
  };
}

// The transitions are covered in logic.test.ts; this checks the React binding.
describe('useRewardsStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useGoalsStore.setState({ templates: [], entries: [lastGoal()], tombstones: {} });
    useRewardsStore.setState({ settling: {}, played: {} });
  });

  afterEach(() => jest.useRealTimers());

  it("settles a section from the goals store's check tap, and plays its reward moment once rested", () => {
    const today = todayKey();
    useGoalsStore.getState().cycleCheck('last', 0);
    const { entries } = useGoalsStore.getState();
    expect(useRewardsStore.getState().settling[today]).toBeDefined();
    expect(useRewardsStore.getState().settleSection(entries, today)).toBe('waiting');

    jest.advanceTimersByTime(SETTLE_MS);
    expect(useRewardsStore.getState().settleSection(entries, today)).toBe('rewarded');
    expect(useRewardsStore.getState().settling).toEqual({});
    expect(useRewardsStore.getState().played).toEqual({ daily: today });
  });

  it('rehydrates the periods already played, and nothing still settling', async () => {
    const saved = {
      settling: { '2026-08-21': '2026-08-21T09:00:00.000Z' },
      played: { daily: '2026-08-21' },
    };
    await AsyncStorage.setItem('daily-goals/rewards', JSON.stringify({ state: saved, version: 1 }));
    await useRewardsStore.persist.rehydrate();
    expect(useRewardsStore.getState().settling).toEqual({});
    expect(useRewardsStore.getState().played).toEqual({ daily: '2026-08-21' });
  });
});
