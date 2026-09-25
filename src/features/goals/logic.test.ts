import { EPOCH } from '@/lib/merge';

import {
  addGoal,
  cycleCheck,
  ensurePeriod,
  entriesForPeriod,
  hasCheckLabels,
  materializedEntryId,
  materializeToday,
  MAX_CHECK_LABEL_LENGTH,
  MAX_CHECKS,
  mergeGoals,
  periodKeyFor,
  periodLabel,
  removeGoal,
  seedGoals,
  toggleStar,
  updateGoal,
  upgradeLegacyGoals,
} from './logic';
import type { GoalEntry, GoalTemplate, Goals, LegacyGoals } from './types';

// The legal-pad date: Fri 8/21/26, ISO week 2026-W34 (Mon 8/17 – Sun 8/23).
const TODAY = '2026-08-21';
// The pen touches the page mid-morning; a later write on another device is an hour on.
const NOW = '2026-08-21T09:00:00.000Z';
const LATER = '2026-08-21T10:00:00.000Z';

function goals(overrides: Partial<Goals> = {}): Goals {
  return { templates: [], entries: [], tombstones: {}, ...overrides };
}

function template(overrides: Partial<GoalTemplate> = {}): GoalTemplate {
  return {
    id: 't1',
    cadence: 'daily',
    title: 'Daily Prod',
    targetCount: 8,
    sortOrder: 1,
    updatedAt: EPOCH,
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
    updatedAt: EPOCH,
    ...overrides,
  };
}

function byId(state: Goals, id: string): GoalEntry | undefined {
  return state.entries.find((e) => e.id === id);
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
          template({ id: 'off', retiredAt: NOW }),
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

describe('materializeToday', () => {
  it("writes every active template onto today's section of its own cadence", () => {
    const state = materializeToday(
      goals({
        templates: [
          template({ id: 'd' }),
          template({ id: 'w', cadence: 'weekly', title: 'Fitness' }),
          template({ id: 'a', cadence: 'annual', title: 'Read 12 books' }),
          template({ id: 'off', retiredAt: NOW }),
        ],
      }),
      TODAY,
    );
    expect(state.entries.map((e) => [e.templateId, e.periodKey])).toEqual([
      ['d', '2026-08-21'],
      ['w', '2026-W34'],
      ['a', '2026'],
    ]);
  });

  it('is idempotent and returns the same value once today is written', () => {
    const once = materializeToday(goals({ templates: [template()] }), TODAY);
    expect(materializeToday(once, TODAY)).toBe(once);
    expect(once.entries).toHaveLength(1);
  });

  it("lands an imported pad with today's lines, leaving its past pages as written", () => {
    const yesterday = entry({
      id: 'y',
      templateId: 't1',
      periodKey: '2026-08-20',
      checks: ['done'],
    });
    const state = materializeToday(goals({ templates: [template()], entries: [yesterday] }), TODAY);
    expect(titlesOn(state, TODAY)).toEqual(['Daily Prod']);
    expect(state.entries[0]).toBe(yesterday);
    expect(state.entries).toHaveLength(2);
  });
});

describe('addGoal', () => {
  const input = { cadence: 'daily' as const, periodKey: TODAY, title: 'Deep Work', targetCount: 2 };

  it('writes a one-off line at the bottom of the section with trimmed title and empty checks', () => {
    const state = addGoal(
      goals({ entries: [entry({ sortOrder: 3 })] }),
      { ...input, title: '  Deep Work  ', repeats: false },
      NOW,
    );
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
    expect(addGoal(start, { ...input, title: '   ', repeats: false }, NOW)).toBe(start);
  });

  it('with repeats, creates a template that materializes on the next period', () => {
    const today = addGoal(goals(), { ...input, repeats: true }, NOW);
    expect(today.templates).toHaveLength(1);
    expect(today.entries[0].templateId).toBe(today.templates[0].id);
    expect(ensurePeriod(today, 'daily', TODAY, TODAY)).toBe(today);

    const tomorrow = ensurePeriod(today, 'daily', '2026-08-22', '2026-08-22');
    expect(titlesOn(tomorrow, '2026-08-22')).toEqual(['Deep Work']);
    expect(tomorrow.entries[1].checks).toHaveLength(2);
  });

  it('keeps the check count between one and the maximum', () => {
    expect(
      addGoal(goals(), { ...input, targetCount: 0, repeats: false }, NOW).entries[0].checks,
    ).toHaveLength(1);
    expect(
      addGoal(goals(), { ...input, targetCount: 99, repeats: true }, NOW).templates[0].targetCount,
    ).toBe(MAX_CHECKS);
  });

  it('writes one trimmed, capped label per check onto the line and its template', () => {
    const state = addGoal(
      goals(),
      {
        ...input,
        targetCount: 3,
        checkLabels: [' Legs ', 'Push-ups', 'Pull', 'Extra'],
        repeats: true,
      },
      NOW,
    );
    expect(state.entries[0].checkLabels).toEqual(['Legs', 'Push-u', 'Pull']);
    expect(state.templates[0].checkLabels).toEqual(['Legs', 'Push-u', 'Pull']);
    expect('Push-u').toHaveLength(MAX_CHECK_LABEL_LENGTH);
  });

  it('leaves unlabeled boxes blank and stores nothing when every label is blank', () => {
    const partial = addGoal(
      goals(),
      {
        ...input,
        targetCount: 3,
        checkLabels: ['Legs'],
        repeats: false,
      },
      NOW,
    );
    expect(partial.entries[0].checkLabels).toEqual(['Legs', '', '']);

    const blank = addGoal(goals(), { ...input, checkLabels: ['', '  '], repeats: true }, NOW);
    expect(blank.entries[0].checkLabels).toBeUndefined();
    expect(blank.templates[0].checkLabels).toBeUndefined();
    expect(JSON.stringify(blank)).not.toContain('checkLabels');
  });

  it('drops labels from a one-check line', () => {
    const state = addGoal(
      goals(),
      {
        ...input,
        targetCount: 1,
        checkLabels: ['Legs'],
        repeats: false,
      },
      NOW,
    );
    expect(state.entries[0].checkLabels).toBeUndefined();
  });
});

describe('check marks and stars', () => {
  it('cycles one check empty → done → missed → empty, leaving the others alone', () => {
    let state = goals({ entries: [entry({ checks: ['empty', 'empty'] })] });
    state = cycleCheck(state, 'e1', 1, NOW);
    expect(state.entries[0].checks).toEqual(['empty', 'done']);
    state = cycleCheck(state, 'e1', 1, NOW);
    expect(state.entries[0].checks).toEqual(['empty', 'missed']);
    state = cycleCheck(state, 'e1', 1, NOW);
    expect(state.entries[0].checks).toEqual(['empty', 'empty']);
  });

  it('ignores unknown entries', () => {
    const start = goals({ entries: [entry()] });
    expect(cycleCheck(start, 'missing', 0, NOW)).toBe(start);
    expect(toggleStar(start, 'missing', NOW)).toBe(start);
  });

  it('floats a starred line to the top of its section and back when unstarred', () => {
    const start = goals({
      entries: [
        entry({ id: 'a', sortOrder: 1 }),
        entry({ id: 'b', sortOrder: 2 }),
        entry({ id: 'other', periodKey: '2026-08-22' }),
      ],
    });
    const starred = toggleStar(start, 'b', NOW);
    expect(entriesForPeriod(starred.entries, TODAY).map((e) => e.id)).toEqual(['b', 'a']);
    const unstarred = toggleStar(starred, 'b', NOW);
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
    const state = updateGoal(recurring(), 'e1', { title: 'Deep Work' }, NOW);
    expect(state.entries[0].title).toBe('Deep Work');
    expect(state.templates[0].title).toBe('Deep Work');
  });

  it('resizes checks preserving marks and carries the new count to future pages', () => {
    const grown = updateGoal(recurring(), 'e1', { targetCount: 5 }, NOW);
    expect(grown.entries[0].checks).toEqual(['done', 'missed', 'empty', 'empty', 'empty']);
    expect(grown.templates[0].targetCount).toBe(5);

    const shrunk = updateGoal(recurring(), 'e1', { targetCount: 2 }, NOW);
    expect(shrunk.entries[0].checks).toEqual(['done', 'missed']);

    const tomorrow = ensurePeriod(grown, 'daily', '2026-08-22', '2026-08-22');
    expect(tomorrow.entries[1].checks).toHaveLength(5);
  });

  it('leaves templates untouched for one-off lines and keeps the old title when blanked', () => {
    const start = goals({ templates: [template()], entries: [entry({ title: 'Keep me' })] });
    const renamed = updateGoal(start, 'e1', { title: 'Renamed' }, NOW);
    expect(renamed.entries[0].title).toBe('Renamed');
    expect(renamed.templates).toBe(start.templates);

    expect(updateGoal(start, 'e1', { title: '   ' }, NOW).entries[0].title).toBe('Keep me');
    expect(updateGoal(start, 'missing', { title: 'X' }, NOW)).toBe(start);
  });

  it('labels the checks of the line and its template, so the next page inherits them', () => {
    const yesterday = entry({
      id: 'y',
      templateId: 't1',
      periodKey: '2026-08-20',
      checks: ['done'],
    });
    const start = recurring();
    start.entries.push(yesterday);

    const labeled = updateGoal(start, 'e1', { checkLabels: [' Legs', 'Push', 'Pull '] }, NOW);
    expect(labeled.entries[0].checkLabels).toEqual(['Legs', 'Push', 'Pull']);
    expect(labeled.entries[0].checks).toEqual(['done', 'missed', 'empty']);
    expect(labeled.templates[0].checkLabels).toEqual(['Legs', 'Push', 'Pull']);
    expect(labeled.entries[1]).toBe(yesterday);

    const tomorrow = ensurePeriod(labeled, 'daily', '2026-08-22', '2026-08-22');
    expect(tomorrow.entries[2].checkLabels).toEqual(['Legs', 'Push', 'Pull']);
  });

  it('fits labels to a new count: shrink trims, grow leaves new boxes blank, one check drops them', () => {
    const labeled = updateGoal(recurring(), 'e1', { checkLabels: ['Legs', 'Push', 'Pull'] }, NOW);

    const shrunk = updateGoal(labeled, 'e1', { targetCount: 2 }, NOW);
    expect(shrunk.entries[0].checkLabels).toEqual(['Legs', 'Push']);
    expect(shrunk.templates[0].checkLabels).toEqual(['Legs', 'Push']);

    const grown = updateGoal(labeled, 'e1', { targetCount: 5 }, NOW);
    expect(grown.entries[0].checkLabels).toEqual(['Legs', 'Push', 'Pull', '', '']);
    expect(grown.entries[0].checks).toEqual(['done', 'missed', 'empty', 'empty', 'empty']);

    const single = updateGoal(labeled, 'e1', { targetCount: 1 }, NOW);
    expect(single.entries[0].checkLabels).toBeUndefined();
    expect(single.templates[0].checkLabels).toBeUndefined();
  });

  it('stores all-blank labels as none, and keeps the labels when the patch omits them', () => {
    const labeled = updateGoal(recurring(), 'e1', { checkLabels: ['Legs', 'Push', 'Pull'] }, NOW);
    expect(updateGoal(labeled, 'e1', { title: 'Lift' }, NOW).entries[0].checkLabels).toEqual([
      'Legs',
      'Push',
      'Pull',
    ]);

    const cleared = updateGoal(labeled, 'e1', { checkLabels: ['', ' ', ''] }, NOW);
    expect(cleared.entries[0].checkLabels).toBeUndefined();
    expect(cleared.templates[0].checkLabels).toBeUndefined();
    expect(JSON.stringify(cleared)).not.toContain('checkLabels');
  });
});

describe('hasCheckLabels', () => {
  it('is true only when some box carries a label', () => {
    expect(hasCheckLabels(undefined)).toBe(false);
    expect(hasCheckLabels([])).toBe(false);
    expect(hasCheckLabels(['', '  '])).toBe(false);
    expect(hasCheckLabels(['', 'Pull'])).toBe(true);
  });
});

describe('removeGoal', () => {
  it('crosses a one-off line off the page, leaving a tombstone', () => {
    const start = goals({ entries: [entry({ id: 'a' }), entry({ id: 'b' })] });
    const state = removeGoal(start, 'a', NOW);
    expect(state.entries.map((e) => e.id)).toEqual(['b']);
    expect(state.tombstones).toEqual({ a: NOW });
  });

  it('retires a recurring goal so it returns to neither this page nor the next', () => {
    let state = ensurePeriod(goals({ templates: [template()] }), 'daily', TODAY, TODAY);
    state = removeGoal(state, state.entries[0].id, NOW);
    expect(state.entries).toHaveLength(0);
    expect(state.templates[0]).toMatchObject({ retiredAt: NOW, updatedAt: NOW });

    expect(ensurePeriod(state, 'daily', TODAY, TODAY)).toBe(state);
    expect(ensurePeriod(state, 'daily', '2026-08-22', '2026-08-22')).toBe(state);
  });

  it('ignores unknown entries', () => {
    const start = goals({ entries: [entry()] });
    expect(removeGoal(start, 'missing', NOW)).toBe(start);
  });
});

describe('identity across devices', () => {
  it('gives a materialized line the same id on every device: its template and period', () => {
    const state = materializeToday(goals({ templates: [template()] }), TODAY);
    expect(state.entries[0].id).toBe(materializedEntryId('t1', TODAY));
    expect(state.entries[0].id).toBe('t1:2026-08-21');
    expect(state.entries[0].updatedAt).toBe(EPOCH);
  });

  it('seeds the same template ids on every device', () => {
    expect(seedGoals().templates.map((t) => t.id)).toEqual([
      'seed:daily:1',
      'seed:daily:2',
      'seed:weekly:1',
      'seed:weekly:2',
      'seed:weekly:3',
    ]);
    expect(seedGoals()).toEqual(seedGoals());
  });

  it('keys a repeating goal written from the form the same way', () => {
    const state = addGoal(
      goals(),
      { cadence: 'daily', periodKey: TODAY, title: 'Deep Work', targetCount: 1, repeats: true },
      NOW,
    );
    expect(state.entries[0].id).toBe(materializedEntryId(state.templates[0].id, TODAY));
  });

  it('never rewrites a line that was crossed off', () => {
    let state = materializeToday(goals({ templates: [template()] }), TODAY);
    const lineId = state.entries[0].id;
    // A tombstone alone (the template still active, as after a merge) keeps the line off.
    state = { ...state, entries: [], tombstones: { [lineId]: NOW } };
    expect(materializeToday(state, TODAY)).toBe(state);
  });
});

describe('stamps', () => {
  it('stamps every write with the moment it happens', () => {
    const start = goals({
      templates: [template()],
      entries: [entry({ id: 'e1', templateId: 't1', title: 'Daily Prod', checks: ['empty'] })],
    });
    expect(byId(cycleCheck(start, 'e1', 0, NOW), 'e1')?.updatedAt).toBe(NOW);
    expect(byId(toggleStar(start, 'e1', NOW), 'e1')?.updatedAt).toBe(NOW);

    const edited = updateGoal(start, 'e1', { title: 'Deep Work' }, NOW);
    expect(byId(edited, 'e1')?.updatedAt).toBe(NOW);
    expect(edited.templates[0].updatedAt).toBe(NOW);

    const added = addGoal(
      start,
      { cadence: 'daily', periodKey: TODAY, title: 'New', targetCount: 1, repeats: true },
      NOW,
    );
    expect(added.entries[1].updatedAt).toBe(NOW);
    expect(added.templates[1].updatedAt).toBe(NOW);
  });
});

describe('mergeGoals', () => {
  /** Two devices, each holding today's page freshly written from the same template. */
  function twoDevices(): [Goals, Goals] {
    const written = materializeToday(goals({ templates: [template({ targetCount: 2 })] }), TODAY);
    return [written, structuredClone(written)];
  }

  it('sees one line where both devices materialized the same morning', () => {
    const [phone, ipad] = twoDevices();
    const merged = mergeGoals(phone, ipad);
    expect(merged.entries).toHaveLength(1);
    expect(merged).toEqual(mergeGoals(ipad, phone));
  });

  it('keeps a check tapped on one device when the other only materialized the line', () => {
    const [phone, ipad] = twoDevices();
    const tapped = cycleCheck(phone, 't1:2026-08-21', 0, NOW);
    expect(byId(mergeGoals(tapped, ipad), 't1:2026-08-21')?.checks).toEqual(['done', 'empty']);
    expect(byId(mergeGoals(ipad, tapped), 't1:2026-08-21')?.checks).toEqual(['done', 'empty']);
  });

  it('keeps edits made to different lines on both devices while offline', () => {
    const [phone, ipad] = twoDevices();
    const onPhone = addGoal(
      phone,
      { cadence: 'daily', periodKey: TODAY, title: 'Phone', targetCount: 1, repeats: false },
      NOW,
    );
    const onIpad = addGoal(
      ipad,
      { cadence: 'daily', periodKey: TODAY, title: 'iPad', targetCount: 1, repeats: false },
      LATER,
    );
    expect(titlesOn(mergeGoals(onPhone, onIpad), TODAY).sort()).toEqual([
      'Daily Prod',
      'Phone',
      'iPad',
    ]);
  });

  it('lets the later write win when the same line is tapped on both devices', () => {
    const [phone, ipad] = twoDevices();
    const onPhone = cycleCheck(phone, 't1:2026-08-21', 0, NOW);
    const onIpad = cycleCheck(ipad, 't1:2026-08-21', 1, LATER);
    const merged = mergeGoals(onPhone, onIpad);
    expect(byId(merged, 't1:2026-08-21')?.checks).toEqual(['empty', 'done']);
  });

  it('keeps a line crossed off on one device off the other, and retires its template', () => {
    const [phone, ipad] = twoDevices();
    const removed = removeGoal(phone, 't1:2026-08-21', NOW);
    const merged = mergeGoals(ipad, removed);
    expect(merged.entries).toHaveLength(0);
    expect(merged.tombstones).toEqual({ 't1:2026-08-21': NOW });
    expect(merged.templates[0].retiredAt).toBe(NOW);
    expect(materializeToday(merged, TODAY)).toBe(merged);
  });

  it('lets a write after a removal revive the line, and a removal after a write remove it', () => {
    const [phone, ipad] = twoDevices();
    const removedFirst = removeGoal(phone, 't1:2026-08-21', NOW);
    const tappedLater = cycleCheck(ipad, 't1:2026-08-21', 0, LATER);
    expect(mergeGoals(removedFirst, tappedLater).entries).toHaveLength(1);
    expect(mergeGoals(removedFirst, tappedLater).tombstones).toEqual({});

    const tappedFirst = cycleCheck(ipad, 't1:2026-08-21', 0, NOW);
    const removedLater = removeGoal(phone, 't1:2026-08-21', LATER);
    expect(mergeGoals(tappedFirst, removedLater).entries).toHaveLength(0);
  });

  it('drops the line a stale device wrote for a template after it was retired', () => {
    const [phone, ipad] = twoDevices();
    const retired = removeGoal(phone, 't1:2026-08-21', NOW);
    // The iPad, not yet having heard, writes tomorrow's page from the retired template.
    const tomorrow = ensurePeriod(ipad, 'daily', '2026-08-22', '2026-08-22');
    expect(byId(tomorrow, 't1:2026-08-22')).toBeDefined();

    const merged = mergeGoals(tomorrow, retired);
    expect(merged.entries).toHaveLength(0);
    expect(merged).toEqual(mergeGoals(retired, tomorrow));
  });

  it('keeps a line written on after its template was retired, and every line from before', () => {
    const [phone, ipad] = twoDevices();
    const yesterday = {
      ...ipad,
      entries: [entry({ id: 't1:2026-08-20', templateId: 't1', periodKey: '2026-08-20' })],
    };
    const retired = removeGoal(phone, 't1:2026-08-21', NOW);
    const ghostTapped = cycleCheck(
      ensurePeriod(yesterday, 'daily', '2026-08-22', '2026-08-22'),
      't1:2026-08-22',
      0,
      LATER,
    );
    const merged = mergeGoals(retired, ghostTapped);
    expect(merged.entries.map((e) => e.id)).toEqual(['t1:2026-08-20', 't1:2026-08-22']);
  });

  it('is idempotent and canonical, so a device with nothing new pushes nothing', () => {
    const [phone, ipad] = twoDevices();
    const merged = mergeGoals(cycleCheck(phone, 't1:2026-08-21', 0, NOW), ipad);
    expect(mergeGoals(merged, ipad)).toEqual(merged);
    expect(mergeGoals(ipad, merged)).toEqual(merged);
  });
});

describe('upgradeLegacyGoals', () => {
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
        title: 'Deep Work',
        targetCount: 8,
        active: false,
        sortOrder: 2,
      },
      { id: 'r3', cadence: 'weekly', title: 'Fitness', targetCount: 7, active: true, sortOrder: 2 },
      { id: 'r4', cadence: 'daily', title: 'Read', targetCount: 1, active: true, sortOrder: 3 },
    ],
    entries: [
      {
        id: 'x1',
        templateId: 'r1',
        cadence: 'daily',
        periodKey: TODAY,
        title: 'Recurring Dailies',
        checks: ['done'],
        starred: false,
        sortOrder: 1,
      },
      {
        id: 'x2',
        templateId: 'r4',
        cadence: 'daily',
        periodKey: TODAY,
        title: 'Read',
        checks: ['empty'],
        starred: false,
        sortOrder: 3,
      },
      {
        id: 'x3',
        cadence: 'daily',
        periodKey: TODAY,
        title: 'One-off',
        checks: ['empty'],
        starred: true,
        sortOrder: 4,
      },
    ],
  };

  it('gives seed templates and materialized lines the ids every device shares', () => {
    const upgraded = upgradeLegacyGoals(legacy, NOW);
    expect(upgraded.templates.map((t) => t.id)).toEqual([
      'seed:daily:1',
      'seed:daily:2',
      'seed:weekly:2',
      'r4',
    ]);
    expect(upgraded.entries.map((e) => [e.id, e.templateId])).toEqual([
      ['seed:daily:1:2026-08-21', 'seed:daily:1'],
      ['r4:2026-08-21', 'r4'],
      ['x3', undefined],
    ]);
  });

  it('stamps everything with the moment of the upgrade and marks retirements at the epoch', () => {
    const upgraded = upgradeLegacyGoals(legacy, NOW);
    expect(upgraded.templates.every((t) => t.updatedAt === NOW)).toBe(true);
    expect(upgraded.entries.every((e) => e.updatedAt === NOW)).toBe(true);
    expect(upgraded.templates.map((t) => t.retiredAt)).toEqual([
      undefined,
      EPOCH,
      undefined,
      undefined,
    ]);
    expect(JSON.stringify(upgraded)).not.toContain('active');
    expect(upgraded.tombstones).toEqual({});
  });

  it('keeps the upgraded pad ahead of a fresh seed, so a new device adopts it', () => {
    const upgraded = upgradeLegacyGoals(legacy, NOW);
    const fresh = materializeToday(seedGoals(), TODAY);
    const merged = mergeGoals(fresh, upgraded);
    expect(merged.templates.find((t) => t.id === 'seed:daily:2')).toMatchObject({
      title: 'Deep Work',
      retiredAt: EPOCH,
    });
    expect(titlesOn(merged, TODAY)).toEqual(['One-off', 'Recurring Dailies', 'Read']);
  });
});
