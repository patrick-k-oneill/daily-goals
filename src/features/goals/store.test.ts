import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDays, todayKey } from '@/lib/dates';
import { EPOCH } from '@/lib/merge';

import { entriesForPeriod, seedGoals } from './logic';
import { useGoalsStore } from './store';
import type { GoalEntry, GoalTemplate, LegacyGoals } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = '2026-08-21T09:00:00.000Z';

const imported: GoalTemplate = {
  id: 'imp',
  cadence: 'daily',
  title: 'Imported',
  targetCount: 1,
  sortOrder: 7,
  updatedAt: NOW,
};

function titlesOn(periodKey: string) {
  return entriesForPeriod(useGoalsStore.getState().entries, periodKey).map((e) => e.title);
}

async function rehydrateFrom(state: unknown, version: number) {
  await AsyncStorage.setItem('daily-goals/goals', JSON.stringify({ state, version }));
  await useGoalsStore.persist.rehydrate();
}

// The transitions are covered in logic.test.ts; this checks the React binding.
describe('useGoalsStore', () => {
  beforeEach(() => useGoalsStore.setState(seedGoals()));

  it("starts from the seeded pad with today's page already written", () => {
    const { entries } = useGoalsStore.getInitialState();
    const titles = entriesForPeriod(entries, todayKey()).map((e) => e.title);
    expect(titles).toEqual(['Recurring Dailies', 'Daily Prod']);
  });

  it("writes today's page onto a rehydrated pad saved on an earlier day", async () => {
    await rehydrateFrom({ templates: [imported], entries: [], tombstones: {} }, 3);
    expect(titlesOn(todayKey())).toEqual(['Imported']);
  });

  it('brings a pad saved before stamps into shape on rehydration', async () => {
    const legacy: LegacyGoals = {
      templates: [
        {
          id: 'r1',
          cadence: 'daily',
          title: 'Recurring Dailies',
          targetCount: 1,
          active: true,
          sortOrder: 1,
        },
        {
          id: 'r2',
          cadence: 'daily',
          title: 'Daily Prod',
          targetCount: 8,
          active: false,
          sortOrder: 2,
        },
      ],
      entries: [
        {
          id: 'x1',
          templateId: 'r1',
          cadence: 'daily',
          periodKey: '2026-08-20',
          title: 'Recurring Dailies',
          checks: ['done'],
          starred: false,
          sortOrder: 1,
        },
      ],
    };
    await rehydrateFrom(legacy, 2);

    const { templates, entries, tombstones } = useGoalsStore.getState();
    expect(templates.map((t) => [t.id, t.retiredAt])).toEqual([
      ['seed:daily:1', undefined],
      ['seed:daily:2', EPOCH],
    ]);
    expect(entries.map((e) => e.id)).toEqual([
      'seed:daily:1:2026-08-20',
      `seed:daily:1:${todayKey()}`,
    ]);
    expect(Date.parse(entries[0].updatedAt)).not.toBeNaN();
    expect(entries[1].updatedAt).toBe(EPOCH);
    expect(tombstones).toEqual({});
  });

  it("lands an imported pad with today's page written, never a past one", () => {
    const yesterday = addDays(todayKey(), -1);
    const line: GoalEntry = {
      id: `imp:${yesterday}`,
      templateId: 'imp',
      cadence: 'daily',
      periodKey: yesterday,
      title: 'Imported',
      checks: ['done'],
      starred: false,
      sortOrder: 7,
      updatedAt: NOW,
    };
    useGoalsStore
      .getState()
      .replaceGoals({ templates: [imported], entries: [line], tombstones: {} });
    expect(titlesOn(todayKey())).toEqual(['Imported']);
    expect(titlesOn(yesterday)).toEqual(['Imported']);
    expect(useGoalsStore.getState().entries).toHaveLength(2);
  });

  it('applies each action as a stamped transition on the persisted state', () => {
    const { addGoal, cycleCheck, removeGoal } = useGoalsStore.getState();
    addGoal({
      cadence: 'daily',
      periodKey: todayKey(),
      title: 'Deep Work',
      targetCount: 1,
      repeats: false,
    });
    const [written] = useGoalsStore.getState().entries;
    expect(written.title).toBe('Deep Work');
    expect(Date.parse(written.updatedAt)).not.toBeNaN();

    cycleCheck(written.id, 0);
    expect(useGoalsStore.getState().entries[0].checks).toEqual(['done']);

    removeGoal(written.id);
    expect(useGoalsStore.getState().entries).toHaveLength(0);
    expect(useGoalsStore.getState().tombstones).toHaveProperty(written.id);
  });

  it("merges another device's copy and lands with today's page written", () => {
    useGoalsStore.getState().mergeGoals({ templates: [imported], entries: [], tombstones: {} });
    expect(titlesOn(todayKey())).toEqual(['Recurring Dailies', 'Daily Prod', 'Imported']);
  });
});
