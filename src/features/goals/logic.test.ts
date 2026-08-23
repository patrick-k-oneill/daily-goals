import {
  applyGoalEdit,
  checksGroupWidth,
  cycleState,
  doneCount,
  emptyChecks,
  entriesForPeriod,
  goalListLayouts,
  goalRowLayout,
  isCurrentPeriod,
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

describe('isCurrentPeriod', () => {
  // 2026-08-21 is a Friday in ISO week 2026-W34 (Mon 8/17 – Sun 8/23).
  it('matches each cadence against today', () => {
    expect(isCurrentPeriod('daily', '2026-08-21', '2026-08-21')).toBe(true);
    expect(isCurrentPeriod('daily', '2026-08-20', '2026-08-21')).toBe(false);
    expect(isCurrentPeriod('weekly', '2026-W34', '2026-08-21')).toBe(true);
    expect(isCurrentPeriod('weekly', '2026-W33', '2026-08-21')).toBe(false);
    expect(isCurrentPeriod('annual', '2026', '2026-08-21')).toBe(true);
    expect(isCurrentPeriod('annual', '2025', '2026-08-21')).toBe(false);
  });

  it('rolls the weekly period over the Sunday→Monday boundary', () => {
    expect(isCurrentPeriod('weekly', '2026-W34', '2026-08-23')).toBe(true); // Sunday
    expect(isCurrentPeriod('weekly', '2026-W34', '2026-08-24')).toBe(false); // Monday
    expect(isCurrentPeriod('weekly', '2026-W35', '2026-08-24')).toBe(true);
  });

  it('rolls the annual period at New Year', () => {
    expect(isCurrentPeriod('annual', '2025', '2025-12-31')).toBe(true);
    expect(isCurrentPeriod('annual', '2025', '2026-01-01')).toBe(false);
  });
});

describe('goal row fit rule', () => {
  it('computes the checks group width as n boxes plus gaps', () => {
    expect(checksGroupWidth(1)).toBe(28);
    expect(checksGroupWidth(7)).toBe(7 * 28 + 6 * 4);
    expect(checksGroupWidth(8)).toBe(8 * 28 + 7 * 4);
  });

  // Measured row widths: 375pt viewport → ~317pt; 402pt (iPhone 17 Pro) → ~344pt;
  // desktop content column → ~650–678pt.
  it('stacks the 7- and 8-check goals at phone width', () => {
    expect(goalRowLayout(317, 7)).toBe('stacked');
    expect(goalRowLayout(317, 8)).toBe('stacked');
  });

  it('stacks a 7-check goal at real-device width (402pt viewport)', () => {
    expect(goalRowLayout(344, 7)).toBe('stacked');
  });

  it('keeps every seeded goal inline at desktop width', () => {
    for (const count of [1, 6, 7, 8]) {
      expect(goalRowLayout(650, count)).toBe('inline');
      expect(goalRowLayout(678, count)).toBe('inline');
    }
  });

  it('keeps a 1-check goal inline down to the narrowest supported viewport', () => {
    expect(goalRowLayout(262, 1)).toBe('inline'); // 320pt viewport → ~262pt row
  });

  it('flips exactly where checks plus the minimum title width stop fitting', () => {
    expect(goalRowLayout(380, 7)).toBe('inline'); // 220 checks + 160 title
    expect(goalRowLayout(379, 7)).toBe('stacked');
  });

  it('treats an unmeasured row as inline', () => {
    expect(goalRowLayout(0, 8)).toBe('inline');
  });
});

describe('goalListLayouts (one rhythm per section)', () => {
  it('stacks every multi-check row when any one of them must stack', () => {
    // Native 402pt content ≈ 344pt: the 6-check row would fit alone, but the
    // 7-check rows force the whole section into the stacked rhythm.
    expect(goalListLayouts(344, [7, 7, 6])).toEqual(['stacked', 'stacked', 'stacked']);
    expect(goalListLayouts(317, [7, 7, 6])).toEqual(['stacked', 'stacked', 'stacked']);
  });

  it('keeps a fitting section fully inline', () => {
    for (const width of [650, 678]) {
      expect(goalListLayouts(width, [7, 7, 6])).toEqual(['inline', 'inline', 'inline']);
      expect(goalListLayouts(width, [1, 8])).toEqual(['inline', 'inline']);
    }
  });

  it('always keeps 1-check rows inline, even inside a stacked section', () => {
    expect(goalListLayouts(317, [1, 8])).toEqual(['inline', 'stacked']);
    expect(goalListLayouts(344, [1, 8])).toEqual(['inline', 'stacked']);
  });

  it('harmonizes exactly at the widest row’s own boundary', () => {
    expect(goalListLayouts(380, [7, 6])).toEqual(['inline', 'inline']);
    expect(goalListLayouts(379, [7, 6])).toEqual(['stacked', 'stacked']);
  });

  it('handles empty lists and unmeasured widths', () => {
    expect(goalListLayouts(344, [])).toEqual([]);
    expect(goalListLayouts(0, [7, 7, 6])).toEqual(['inline', 'inline', 'inline']);
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
