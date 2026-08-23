import { addDays, todayKey, weekKeyOf } from '@/lib/dates';

import { useGoalsStore } from './store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function resetStore() {
  useGoalsStore.setState({ hydrated: true, seeded: false, templates: [], entries: [] });
}

describe('ensurePeriod', () => {
  beforeEach(resetStore);

  it('seeds templates and materializes entries for the current period', () => {
    useGoalsStore.getState().ensurePeriod('daily', todayKey());
    const { templates, entries, seeded } = useGoalsStore.getState();
    expect(seeded).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.periodKey === todayKey())).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  it('is idempotent for the current period', () => {
    useGoalsStore.getState().ensurePeriod('daily', todayKey());
    const count = useGoalsStore.getState().entries.length;
    useGoalsStore.getState().ensurePeriod('daily', todayKey());
    expect(useGoalsStore.getState().entries.length).toBe(count);
  });

  it('creates zero entries when flipping to past pages', () => {
    useGoalsStore.getState().ensurePeriod('daily', todayKey());
    const count = useGoalsStore.getState().entries.length;
    for (let back = 1; back <= 3; back++) {
      useGoalsStore.getState().ensurePeriod('daily', addDays(todayKey(), -back));
    }
    useGoalsStore.getState().ensurePeriod('weekly', weekKeyOf(addDays(todayKey(), -7)));
    expect(useGoalsStore.getState().entries.length).toBe(count);
  });

  it('still seeds templates when the first page viewed is a past one', () => {
    useGoalsStore.getState().ensurePeriod('daily', addDays(todayKey(), -1));
    const { templates, entries, seeded } = useGoalsStore.getState();
    expect(seeded).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    expect(entries).toHaveLength(0);
  });
});
