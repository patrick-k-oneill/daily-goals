import {
  applyGoalEdit,
  cycleState,
  doneCount,
  emptyChecks,
  entriesForPeriod,
  missingEntries,
  nextSortOrder,
  periodKeyFor,
  resizeChecks,
} from './logic';
import type { GoalEntry, GoalTemplate } from './types';

function template(overrides: Partial<GoalTemplate> = {}): GoalTemplate {
  return {
    id: 't1',
    cadence: 'daily',
    title: 'Daily Prod',
    targetCount: 8,
    active: true,
    sortOrder: 1,
    createdAt: '2026-08-21',
    ...overrides,
  };
}

function entry(overrides: Partial<GoalEntry> = {}): GoalEntry {
  return {
    id: 'e1',
    cadence: 'daily',
    periodKey: '2026-08-21',
    title: 'One-off',
    checks: ['empty'],
    starred: false,
    sortOrder: 1,
    ...overrides,
  };
}

describe('periodKeyFor', () => {
  it('maps a day to each cadence period', () => {
    expect(periodKeyFor('daily', '2026-08-21')).toBe('2026-08-21');
    expect(periodKeyFor('weekly', '2026-08-21')).toBe('2026-W34');
    expect(periodKeyFor('annual', '2026-08-21')).toBe('2026');
  });
});

describe('missingEntries', () => {
  it('materializes active templates with the right check count', () => {
    const additions = missingEntries([template()], [], 'daily', '2026-08-21');
    expect(additions).toHaveLength(1);
    expect(additions[0].checks).toHaveLength(8);
    expect(additions[0].templateId).toBe('t1');
    expect(additions[0].periodKey).toBe('2026-08-21');
  });

  it('is idempotent once a template is instantiated', () => {
    const [made] = missingEntries([template()], [], 'daily', '2026-08-21');
    expect(missingEntries([template()], [made], 'daily', '2026-08-21')).toHaveLength(0);
  });

  it('skips inactive templates and other cadences', () => {
    const templates = [
      template({ id: 'off', active: false }),
      template({ id: 'weekly', cadence: 'weekly' }),
    ];
    expect(missingEntries(templates, [], 'daily', '2026-08-21')).toHaveLength(0);
  });

  it('materializes for a new period even when a past period exists', () => {
    const [friday] = missingEntries([template()], [], 'daily', '2026-08-21');
    const saturday = missingEntries([template()], [friday], 'daily', '2026-08-22');
    expect(saturday).toHaveLength(1);
  });
});

describe('check states', () => {
  it('cycles empty → done → missed → empty', () => {
    expect(cycleState('empty')).toBe('done');
    expect(cycleState('done')).toBe('missed');
    expect(cycleState('missed')).toBe('empty');
  });

  it('resizes checks preserving existing marks', () => {
    expect(resizeChecks(['done', 'missed'], 4)).toEqual(['done', 'missed', 'empty', 'empty']);
    expect(resizeChecks(['done', 'missed', 'empty'], 2)).toEqual(['done', 'missed']);
    expect(resizeChecks([], 0)).toEqual(['empty']);
  });

  it('counts completed checks', () => {
    expect(doneCount(entry({ checks: ['done', 'missed', 'done', 'empty'] }))).toBe(2);
    expect(emptyChecks(3)).toEqual(['empty', 'empty', 'empty']);
  });
});

describe('applyGoalEdit', () => {
  it('renames the entry and its template together', () => {
    const result = applyGoalEdit(
      [entry({ id: 'e1', templateId: 't1', title: 'Daily Prod' })],
      [template({ id: 't1', title: 'Daily Prod' })],
      'e1',
      { title: 'Deep Work' },
    );
    expect(result.entries[0].title).toBe('Deep Work');
    expect(result.templates[0].title).toBe('Deep Work');
  });

  it('resizes checks preserving marks and syncs the template target', () => {
    const result = applyGoalEdit(
      [entry({ id: 'e1', templateId: 't1', checks: ['done', 'missed', 'empty'] })],
      [template({ id: 't1', targetCount: 3 })],
      'e1',
      { targetCount: 5 },
    );
    expect(result.entries[0].checks).toEqual(['done', 'missed', 'empty', 'empty', 'empty']);
    expect(result.templates[0].targetCount).toBe(5);
  });

  it('leaves templates untouched for one-off goals', () => {
    const templates = [template()];
    const result = applyGoalEdit([entry({ id: 'e1' })], templates, 'e1', { title: 'Renamed' });
    expect(result.entries[0].title).toBe('Renamed');
    expect(result.templates).toBe(templates);
  });

  it('ignores a blank title and unknown entries', () => {
    const result = applyGoalEdit([entry({ id: 'e1', title: 'Keep me' })], [], 'e1', {
      title: '   ',
    });
    expect(result.entries[0].title).toBe('Keep me');

    const untouched = applyGoalEdit([entry({ id: 'e1' })], [], 'missing', { title: 'X' });
    expect(untouched.entries[0].title).toBe('One-off');
  });
});

describe('page ordering', () => {
  it('floats starred goals, then keeps writing order', () => {
    const list = [
      entry({ id: 'a', sortOrder: 1 }),
      entry({ id: 'b', sortOrder: 2, starred: true }),
      entry({ id: 'c', sortOrder: 3 }),
      entry({ id: 'other-period', periodKey: '2026-08-22' }),
    ];
    expect(entriesForPeriod(list, '2026-08-21').map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('assigns the next sort order past the current max', () => {
    expect(nextSortOrder([{ sortOrder: 3 }, { sortOrder: 7 }])).toBe(8);
    expect(nextSortOrder([])).toBe(1);
  });
});
