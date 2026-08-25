import {
  addGoal,
  cycleCheck,
  ensurePeriod,
  entriesForPeriod,
  MAX_CHECKS,
  periodKeyFor,
  periodLabel,
  removeGoal,
  seedGoals,
  toggleStar,
  updateGoal,
} from './logic';
import type { GoalEntry, GoalTemplate, Goals } from './types';

// The legal-pad date: Fri 8/21/26, ISO week 2026-W34 (Mon 8/17 – Sun 8/23).
const TODAY = '2026-08-21';

function goals(overrides: Partial<Goals> = {}): Goals {
  return { templates: [], entries: [], ...overrides };
}

function template(overrides: Partial<GoalTemplate> = {}): GoalTemplate {
  return {
    id: 't1',
    cadence: 'daily',
    title: 'Daily Prod',
    targetCount: 8,
    active: true,
    sortOrder: 1,
    ...overrides,
  };
}

function entry(overrides: Partial<GoalEntry> = {}): GoalEntry {
  return {
    id: 'e1',
    cadence: 'daily',
    periodKey: TODAY,
    title: 'One-off',
    checks: ['empty'],
    starred: false,
    sortOrder: 1,
    ...overrides,
  };
}

function titlesOn(state: Goals, periodKey: string) {
  return entriesForPeriod(state.entries, periodKey).map((e) => e.title);
}

describe('periods', () => {
  it('maps a day to each cadence period and labels it the way the pad does', () => {
    expect(periodKeyFor('daily', TODAY)).toBe('2026-08-21');
    expect(periodKeyFor('weekly', TODAY)).toBe('2026-W34');
    expect(periodKeyFor('annual', TODAY)).toBe('2026');

    expect(periodLabel('daily', TODAY)).toBe('Fri 8/21/26');
    expect(periodLabel('weekly', TODAY)).toBe('Aug 17 – 23');
    expect(periodLabel('annual', TODAY)).toBe('2026');
  });
});

describe('ensurePeriod', () => {
  it('materializes active templates onto the current period with their checks and labels', () => {
    const labels = ['Legs', 'Push', 'Pull'];
    const state = ensurePeriod(
      goals({ templates: [template({ targetCount: 3, checkLabels: labels })] }),
      'daily',
      TODAY,
      TODAY,
    );
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({
      templateId: 't1',
      periodKey: TODAY,
      title: 'Daily Prod',
      checks: ['empty', 'empty', 'empty'],
      checkLabels: labels,
      starred: false,
    });
  });

  it('is idempotent and returns the same value when nothing is missing', () => {
    const once = ensurePeriod(goals({ templates: [template()] }), 'daily', TODAY, TODAY);
    const twice = ensurePeriod(once, 'daily', TODAY, TODAY);
    expect(twice).toBe(once);
    expect(twice.entries).toHaveLength(1);
  });

  it('writes nothing onto past or future pages — paper shows only what was written', () => {
    const start = goals({ templates: [template()] });
    expect(ensurePeriod(start, 'daily', '2026-08-20', TODAY)).toBe(start);
    expect(ensurePeriod(start, 'daily', '2026-08-22', TODAY)).toBe(start);
    expect(ensurePeriod(start, 'weekly', '2026-W33', TODAY)).toBe(start);
  });

  it('rolls over at the ISO week and year boundaries', () => {
    const weekly = goals({ templates: [template({ cadence: 'weekly' })] });
    expect(ensurePeriod(weekly, 'weekly', '2026-W34', '2026-08-23').entries).toHaveLength(1); // Sun
    expect(ensurePeriod(weekly, 'weekly', '2026-W34', '2026-08-24')).toBe(weekly); // Mon
    expect(ensurePeriod(weekly, 'weekly', '2026-W35', '2026-08-24').entries).toHaveLength(1);

    const annual = goals({ templates: [template({ cadence: 'annual' })] });
    expect(ensurePeriod(annual, 'annual', '2025', '2025-12-31').entries).toHaveLength(1);
    expect(ensurePeriod(annual, 'annual', '2025', '2026-01-01')).toBe(annual);
  });

  it('skips inactive templates and other cadences', () => {
    const state = ensurePeriod(
      goals({
        templates: [
          template({ id: 'off', active: false }),
          template({ id: 'wk', cadence: 'weekly' }),
        ],
      }),
      'daily',
      TODAY,
      TODAY,
    );
    expect(state.entries).toHaveLength(0);
  });

  it('starts each new day with a fresh line for every recurring goal', () => {
    const friday = ensurePeriod(goals({ templates: [template()] }), 'daily', TODAY, TODAY);
    const saturday = ensurePeriod(friday, 'daily', '2026-08-22', '2026-08-22');
    expect(saturday.entries).toHaveLength(2);
    expect(titlesOn(saturday, '2026-08-22')).toEqual(['Daily Prod']);
  });

  it("seeds the pad's recurring goals onto today's daily and weekly sections", () => {
    let state = ensurePeriod(seedGoals(), 'daily', TODAY, TODAY);
    state = ensurePeriod(state, 'weekly', '2026-W34', TODAY);
    expect(titlesOn(state, TODAY)).toEqual(['Recurring Dailies', 'Daily Prod']);
    expect(titlesOn(state, '2026-W34')).toEqual(['Recurring Dailies', 'Fitness', 'Weekly Prod']);
    expect(state.entries.find((e) => e.title === 'Fitness')?.checkLabels).toHaveLength(7);
  });
});

describe('addGoal', () => {
  const input = { cadence: 'daily' as const, periodKey: TODAY, title: 'Deep Work', targetCount: 2 };

  it('writes a one-off line at the bottom of the section with trimmed title and empty checks', () => {
    const state = addGoal(goals({ entries: [entry({ sortOrder: 3 })] }), {
      ...input,
      title: '  Deep Work  ',
      repeats: false,
    });
    expect(titlesOn(state, TODAY)).toEqual(['One-off', 'Deep Work']);
    expect(state.entries[1]).toMatchObject({
      title: 'Deep Work',
      checks: ['empty', 'empty'],
      templateId: undefined,
      sortOrder: 4,
    });
    expect(state.templates).toHaveLength(0);
  });

  it('writes nothing for a blank title', () => {
    const start = goals();
    expect(addGoal(start, { ...input, title: '   ', repeats: false })).toBe(start);
  });

  it('with repeats, creates a template that materializes on the next period', () => {
    const today = addGoal(goals(), { ...input, repeats: true });
    expect(today.templates).toHaveLength(1);
    expect(today.entries[0].templateId).toBe(today.templates[0].id);
    expect(ensurePeriod(today, 'daily', TODAY, TODAY)).toBe(today);

    const tomorrow = ensurePeriod(today, 'daily', '2026-08-22', '2026-08-22');
    expect(titlesOn(tomorrow, '2026-08-22')).toEqual(['Deep Work']);
    expect(tomorrow.entries[1].checks).toHaveLength(2);
  });

  it('keeps the check count between one and the maximum', () => {
    expect(
      addGoal(goals(), { ...input, targetCount: 0, repeats: false }).entries[0].checks,
    ).toHaveLength(1);
    expect(
      addGoal(goals(), { ...input, targetCount: 99, repeats: true }).templates[0].targetCount,
    ).toBe(MAX_CHECKS);
  });
});

describe('check marks and stars', () => {
  it('cycles one check empty → done → missed → empty, leaving the others alone', () => {
    let state = goals({ entries: [entry({ checks: ['empty', 'empty'] })] });
    state = cycleCheck(state, 'e1', 1);
    expect(state.entries[0].checks).toEqual(['empty', 'done']);
    state = cycleCheck(state, 'e1', 1);
    expect(state.entries[0].checks).toEqual(['empty', 'missed']);
    state = cycleCheck(state, 'e1', 1);
    expect(state.entries[0].checks).toEqual(['empty', 'empty']);
  });

  it('ignores unknown entries', () => {
    const start = goals({ entries: [entry()] });
    expect(cycleCheck(start, 'missing', 0)).toBe(start);
    expect(toggleStar(start, 'missing')).toBe(start);
  });

  it('floats a starred line to the top of its section and back when unstarred', () => {
    const start = goals({
      entries: [
        entry({ id: 'a', sortOrder: 1 }),
        entry({ id: 'b', sortOrder: 2 }),
        entry({ id: 'other', periodKey: '2026-08-22' }),
      ],
    });
    const starred = toggleStar(start, 'b');
    expect(entriesForPeriod(starred.entries, TODAY).map((e) => e.id)).toEqual(['b', 'a']);
    const unstarred = toggleStar(starred, 'b');
    expect(entriesForPeriod(unstarred.entries, TODAY).map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('updateGoal', () => {
  const recurring = () =>
    goals({
      templates: [template({ id: 't1', title: 'Daily Prod', targetCount: 3 })],
      entries: [
        entry({
          id: 'e1',
          templateId: 't1',
          title: 'Daily Prod',
          checks: ['done', 'missed', 'empty'],
        }),
      ],
    });

  it('renames the line and its template together', () => {
    const state = updateGoal(recurring(), 'e1', { title: 'Deep Work' });
    expect(state.entries[0].title).toBe('Deep Work');
    expect(state.templates[0].title).toBe('Deep Work');
  });

  it('resizes checks preserving marks and carries the new count to future pages', () => {
    const grown = updateGoal(recurring(), 'e1', { targetCount: 5 });
    expect(grown.entries[0].checks).toEqual(['done', 'missed', 'empty', 'empty', 'empty']);
    expect(grown.templates[0].targetCount).toBe(5);

    const shrunk = updateGoal(recurring(), 'e1', { targetCount: 2 });
    expect(shrunk.entries[0].checks).toEqual(['done', 'missed']);

    const tomorrow = ensurePeriod(grown, 'daily', '2026-08-22', '2026-08-22');
    expect(tomorrow.entries[1].checks).toHaveLength(5);
  });

  it('leaves templates untouched for one-off lines and keeps the old title when blanked', () => {
    const start = goals({ templates: [template()], entries: [entry({ title: 'Keep me' })] });
    const renamed = updateGoal(start, 'e1', { title: 'Renamed' });
    expect(renamed.entries[0].title).toBe('Renamed');
    expect(renamed.templates).toBe(start.templates);

    expect(updateGoal(start, 'e1', { title: '   ' }).entries[0].title).toBe('Keep me');
    expect(updateGoal(start, 'missing', { title: 'X' })).toBe(start);
  });
});

describe('removeGoal', () => {
  it('crosses a one-off line off the page', () => {
    const state = removeGoal(goals({ entries: [entry({ id: 'a' }), entry({ id: 'b' })] }), 'a');
    expect(state.entries.map((e) => e.id)).toEqual(['b']);
  });

  it('retires a recurring goal so it returns to neither this page nor the next', () => {
    let state = ensurePeriod(goals({ templates: [template()] }), 'daily', TODAY, TODAY);
    state = removeGoal(state, state.entries[0].id);
    expect(state.entries).toHaveLength(0);
    expect(state.templates[0].active).toBe(false);

    expect(ensurePeriod(state, 'daily', TODAY, TODAY)).toBe(state);
    expect(ensurePeriod(state, 'daily', '2026-08-22', '2026-08-22')).toBe(state);
  });

  it('ignores unknown entries', () => {
    const start = goals({ entries: [entry()] });
    expect(removeGoal(start, 'missing')).toBe(start);
  });
});
