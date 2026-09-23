import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDays, todayKey } from '@/lib/dates';

import { entriesForPeriod, seedGoals } from './logic';
import { useGoalsStore } from './store';
import type { GoalEntry, GoalTemplate } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const imported: GoalTemplate = {
  id: 'imp',
  cadence: 'daily',
  title: 'Imported',
  targetCount: 1,
  active: true,
  sortOrder: 1,
};

function titlesOn(periodKey: string) {
  return entriesForPeriod(useGoalsStore.getState().entries, periodKey).map((e) => e.title);
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
    await AsyncStorage.setItem(
      'daily-goals/goals',
      JSON.stringify({ state: { templates: [imported], entries: [] }, version: 2 }),
    );
    await useGoalsStore.persist.rehydrate();
    expect(titlesOn(todayKey())).toEqual(['Imported']);
  });

  it("lands an imported pad with today's page written, never a past one", () => {
    const yesterday = addDays(todayKey(), -1);
    const line: GoalEntry = {
      id: 'y',
      templateId: 'imp',
      cadence: 'daily',
      periodKey: yesterday,
      title: 'Imported',
      checks: ['done'],
      starred: false,
      sortOrder: 1,
    };
    useGoalsStore.getState().replaceGoals({ templates: [imported], entries: [line] });
    expect(titlesOn(todayKey())).toEqual(['Imported']);
    expect(titlesOn(yesterday)).toEqual(['Imported']);
    expect(useGoalsStore.getState().entries).toHaveLength(2);
  });

  it('applies each action as a transition on the persisted state', () => {
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

    cycleCheck(written.id, 0);
    expect(useGoalsStore.getState().entries[0].checks).toEqual(['done']);

    removeGoal(written.id);
    expect(useGoalsStore.getState().entries).toHaveLength(0);
  });
});
