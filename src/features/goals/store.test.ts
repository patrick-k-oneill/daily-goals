import { addDays, todayKey } from '@/lib/dates';

import { seedGoals } from './logic';
import { useGoalsStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The transitions are covered in logic.test.ts; this checks the React binding.
describe('useGoalsStore', () => {
  beforeEach(() => useGoalsStore.setState(seedGoals()));

  it("starts from the seeded pad and materializes today's page, never a past one", () => {
    const { ensurePeriod } = useGoalsStore.getState();
    ensurePeriod('daily', addDays(todayKey(), -1));
    expect(useGoalsStore.getState().entries).toHaveLength(0);

    ensurePeriod('daily', todayKey());
    const titles = useGoalsStore.getState().entries.map((e) => e.title);
    expect(titles).toEqual(['Recurring Dailies', 'Daily Prod']);
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
