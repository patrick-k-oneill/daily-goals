import { dayKeyOf } from '@/lib/dates';
import { EPOCH, LEGACY } from '@/lib/merge';

import {
  acceptSuggestion,
  addGoal,
  carriedEntryId,
  clampChecks,
  cycleCheck,
  declineSuggestion,
  ensurePeriod,
  entriesForPeriod,
  EVERY_WEEKDAY,
  hasCheckLabels,
  isRecurring,
  isSectionComplete,
  managesGoal,
  materializedEntryId,
  materializeToday,
  MAX_CHECK_LABEL_LENGTH,
  MAX_CHECKS,
  mergeGoals,
  moveEntry,
  msUntilSettled,
  periodKeyFor,
  removeGoal,
  retireStars,
  REWARD_GRACE_MS,
  sectionStatus,
  sectionTitle,
  SETTLE_MS,
  settleAfterTap,
  settleSection,
  seedGoals,
  stampCounts,
  startedTemplateId,
  startRepeating,
  stopRepeating,
  suggestionNote,
  suggestionSourceId,
  suggestionsFor,
  updateGoal,
  upgradeLegacyGoals,
  type GoalEditPatch,
} from './logic';
import type {
  GoalEntry,
  GoalTemplate,
  Goals,
  LegacyGoals,
  Rewards,
  StarredGoalEntry,
  CarryoverSuggestion,
  Reminder,
  ReminderSuggestion,
  StarredGoals,
} from './types';

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
    sortOrder: 1,
    updatedAt: EPOCH,
    ...overrides,
  };
}

/** An entry as a pad persisted while the star was drawn carried it. */
function starredEntry(overrides: Partial<StarredGoalEntry> = {}): StarredGoalEntry {
  return { ...entry(), ...overrides };
}

function byId(state: Goals, id: string): GoalEntry | undefined {
  return state.entries.find((e) => e.id === id);
}

function titlesOn(state: Goals, periodKey: string) {
  return entriesForPeriod(state.entries, periodKey).map((e) => e.title);
}

describe('periods', () => {
  it('maps a day to each cadence period', () => {
    expect(periodKeyFor('daily', TODAY)).toBe('2026-08-21');
    expect(periodKeyFor('weekly', TODAY)).toBe('2026-W34');
    expect(periodKeyFor('annual', TODAY)).toBe('2026');
  });
});

describe('entriesForPeriod', () => {
  it("reads one period's lines in their stored order, however they were written", () => {
    const state = goals({
      entries: [
        entry({ id: 'b', sortOrder: 2 }),
        entry({ id: 'a', sortOrder: 1 }),
        entry({ id: 'other', periodKey: '2026-08-22' }),
      ],
    });
    expect(entriesForPeriod(state.entries, TODAY).map((e) => e.id)).toEqual(['a', 'b']);
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

  it('writes a daily template only on the weekdays it names', () => {
    const start = goals({ templates: [template({ weekdays: [1, 3, 5] })] });
    expect(ensurePeriod(start, 'daily', TODAY, TODAY).entries).toHaveLength(1); // Fri
    expect(ensurePeriod(start, 'daily', '2026-08-22', '2026-08-22')).toBe(start); // Sat
    expect(ensurePeriod(start, 'daily', '2026-08-23', '2026-08-23')).toBe(start); // Sun
    expect(ensurePeriod(start, 'daily', '2026-08-24', '2026-08-24').entries).toHaveLength(1); // Mon
    expect(ensurePeriod(start, 'daily', '2026-08-25', '2026-08-25')).toBe(start); // Tue
  });

  it('writes a template that names no weekdays every day, and ignores weekdays off the daily cadence', () => {
    const everyDay = goals({
      templates: [template({ id: 'a' }), template({ id: 'b', weekdays: [] })],
    });
    expect(ensurePeriod(everyDay, 'daily', '2026-08-23', '2026-08-23').entries).toHaveLength(2); // Sun

    const weekly = goals({ templates: [template({ cadence: 'weekly', weekdays: [1] })] });
    expect(ensurePeriod(weekly, 'weekly', '2026-W34', TODAY).entries).toHaveLength(1); // Fri
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

  it('with weekdays, writes the line today only on a named day, then on each named day after', () => {
    const scheduled = { ...input, repeats: true, weekdays: [5, 3, 1, 3] };
    const friday = addGoal(goals(), scheduled, NOW);
    expect(friday.templates[0].weekdays).toEqual([1, 3, 5]);
    expect(titlesOn(friday, TODAY)).toEqual(['Deep Work']);

    const nextWeek = ['2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26'];
    const written = nextWeek.reduce((state, day) => ensurePeriod(state, 'daily', day, day), friday);
    expect(nextWeek.filter((day) => titlesOn(written, day).length > 0)).toEqual([
      '2026-08-24', // Mon
      '2026-08-26', // Wed
    ]);

    const saturday = addGoal(goals(), { ...scheduled, periodKey: '2026-08-22' }, NOW);
    expect(saturday.templates).toHaveLength(1);
    expect(saturday.entries).toHaveLength(0);
  });

  it('stores no weekdays when every day or none is named, nor off the daily cadence', () => {
    const everyDay = addGoal(
      goals(),
      { ...input, repeats: true, weekdays: [...EVERY_WEEKDAY] },
      NOW,
    );
    expect(everyDay.templates[0].weekdays).toBeUndefined();
    expect(JSON.stringify(everyDay)).not.toContain('weekdays');

    const none = addGoal(goals(), { ...input, repeats: true, weekdays: [0, 8, 2.5] }, NOW);
    expect(none.templates[0].weekdays).toBeUndefined();
    expect(titlesOn(none, TODAY)).toEqual(['Deep Work']);

    const weekly = addGoal(
      goals(),
      { ...input, cadence: 'weekly', periodKey: '2026-W34', repeats: true, weekdays: [1] },
      NOW,
    );
    expect(weekly.templates[0].weekdays).toBeUndefined();
    expect(weekly.entries).toHaveLength(1);
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

describe('check marks', () => {
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
  });
});

describe('achieved sections', () => {
  const WEEK = '2026-W34';
  const YESTERDAY = '2026-08-20';
  const NO_REWARDS: Rewards = { settling: {}, played: {} };

  const after = (ms: number, since = NOW) => new Date(Date.parse(since) + ms).toISOString();

  /** One pen tap as the stores apply it: the check cycles, then the section's settling follows. */
  function tap(
    pad: { goals: Goals; rewards: Rewards },
    entryId: string,
    at: string,
    checkIndex = 0,
  ) {
    const next = cycleCheck(pad.goals, entryId, checkIndex, at);
    return { goals: next, rewards: settleAfterTap(pad.rewards, next.entries, entryId, at) };
  }

  /** Today's section with one line done and the last one still empty. */
  const lastGoalOpen = () => ({
    goals: goals({
      entries: [entry({ id: 'a', checks: ['done'] }), entry({ id: 'b', checks: ['empty'] })],
    }),
    rewards: NO_REWARDS,
  });

  it('is complete only when every check on every line of the period is done', () => {
    const lines = [
      entry({ id: 'a', checks: ['done', 'done'] }),
      entry({ id: 'b', checks: ['done'] }),
      entry({ id: 'y', periodKey: YESTERDAY, checks: ['empty'] }),
    ];
    expect(isSectionComplete(lines, TODAY)).toBe(true);
    expect(isSectionComplete(lines, YESTERDAY)).toBe(false);
    expect(isSectionComplete([entry({ checks: ['done', 'missed'] })], TODAY)).toBe(false);
  });

  it('never counts a section with no lines as complete', () => {
    expect(isSectionComplete([], TODAY)).toBe(false);
    expect(sectionStatus({}, [], TODAY)).toBe('open');
  });

  it('heads a section with its name, and with "Achieved!" only once it is achieved', () => {
    expect(sectionTitle('daily', 'open')).toBe('Daily Goals');
    expect(sectionTitle('weekly', 'settling')).toBe('Weekly Goals');
    expect(sectionTitle('daily', 'achieved')).toBe('Daily Goals Achieved!');
    expect(sectionTitle('weekly', 'achieved')).toBe('Weekly Goals Achieved!');
    expect(sectionTitle('annual', 'achieved')).toBe('Annual Goals Achieved!');
  });

  it('holds a section the last tap completed as settling, then achieves it and plays the reward moment', () => {
    const tapped = tap(lastGoalOpen(), 'b', NOW);
    expect(sectionStatus(tapped.rewards.settling, tapped.goals.entries, TODAY)).toBe('settling');

    const early = settleSection(
      tapped.rewards,
      tapped.goals.entries,
      TODAY,
      TODAY,
      after(SETTLE_MS - 1),
    );
    expect(early).toEqual({ rewards: tapped.rewards, outcome: 'waiting' });

    const settled = settleSection(
      tapped.rewards,
      tapped.goals.entries,
      TODAY,
      TODAY,
      after(SETTLE_MS),
    );
    expect(settled.outcome).toBe('rewarded');
    expect(settled.rewards).toEqual({ settling: {}, played: { daily: TODAY } });
    expect(sectionStatus(settled.rewards.settling, tapped.goals.entries, TODAY)).toBe('achieved');
  });

  it('never achieves a section whose last check is cycled past done to missed', () => {
    const passingDone = tap(lastGoalOpen(), 'b', NOW);
    const missed = tap(passingDone, 'b', after(400));
    expect(byId(missed.goals, 'b')?.checks).toEqual(['missed']);
    expect(missed.rewards).toEqual(NO_REWARDS);
    expect(sectionStatus(missed.rewards.settling, missed.goals.entries, TODAY)).toBe('open');

    const settled = settleSection(
      missed.rewards,
      missed.goals.entries,
      TODAY,
      TODAY,
      after(SETTLE_MS),
    );
    expect(settled).toEqual({ rewards: NO_REWARDS, outcome: 'lapsed' });
  });

  it('settles from the tap that completed the section, not from an earlier pass', () => {
    let pad = tap(lastGoalOpen(), 'b', NOW);
    pad = tap(pad, 'b', after(300));
    pad = tap(pad, 'b', after(600));
    pad = tap(pad, 'b', after(900));
    expect(byId(pad.goals, 'b')?.checks).toEqual(['done']);
    expect(msUntilSettled(pad.rewards.settling[TODAY], after(SETTLE_MS))).toBe(900);
    expect(
      settleSection(pad.rewards, pad.goals.entries, TODAY, TODAY, after(SETTLE_MS)).outcome,
    ).toBe('waiting');
    expect(
      settleSection(pad.rewards, pad.goals.entries, TODAY, TODAY, after(900 + SETTLE_MS)).outcome,
    ).toBe('rewarded');
  });

  it('leaves settling alone when a tap does not complete the section', () => {
    const start = {
      goals: goals({ entries: [entry({ id: 'a' }), entry({ id: 'b' })] }),
      rewards: NO_REWARDS,
    };
    expect(tap(start, 'a', NOW).rewards).toBe(NO_REWARDS);
    expect(settleAfterTap(NO_REWARDS, start.goals.entries, 'missing', NOW)).toBe(NO_REWARDS);
  });

  it('plays the reward moment once per period, and again on the next one', () => {
    let pad = tap(lastGoalOpen(), 'b', NOW);
    pad = {
      ...pad,
      rewards: settleSection(pad.rewards, pad.goals.entries, TODAY, TODAY, after(SETTLE_MS))
        .rewards,
    };

    pad = tap(pad, 'b', LATER);
    pad = tap(pad, 'b', LATER);
    pad = tap(pad, 'b', LATER);
    expect(sectionStatus(pad.rewards.settling, pad.goals.entries, TODAY)).toBe('settling');
    const again = settleSection(
      pad.rewards,
      pad.goals.entries,
      TODAY,
      TODAY,
      after(SETTLE_MS, LATER),
    );
    expect(again.outcome).toBe('achieved');
    expect(again.rewards).toEqual({ settling: {}, played: { daily: TODAY } });

    const TOMORROW = '2026-08-22';
    const nextDay = tap(
      {
        goals: goals({ entries: [entry({ id: 'c', periodKey: TOMORROW })] }),
        rewards: again.rewards,
      },
      'c',
      '2026-08-22T09:00:00.000Z',
    );
    const settled = settleSection(
      nextDay.rewards,
      nextDay.goals.entries,
      TOMORROW,
      TOMORROW,
      '2026-08-22T09:00:02.000Z',
    );
    expect(settled.outcome).toBe('rewarded');
    expect(settled.rewards.played).toEqual({ daily: TOMORROW });
  });

  it('achieves a section that settles late without its reward moment, which is still owed', () => {
    const tapped = tap(lastGoalOpen(), 'b', NOW);
    const { entries } = tapped.goals;
    const onTime = after(SETTLE_MS + REWARD_GRACE_MS);
    expect(settleSection(tapped.rewards, entries, TODAY, TODAY, onTime).outcome).toBe('rewarded');

    const late = settleSection(tapped.rewards, entries, TODAY, TODAY, LATER);
    expect(late).toEqual({ rewards: NO_REWARDS, outcome: 'achieved' });
    expect(sectionStatus(late.rewards.settling, entries, TODAY)).toBe('achieved');

    let pad = { goals: tapped.goals, rewards: late.rewards };
    pad = tap(pad, 'b', LATER);
    pad = tap(pad, 'b', LATER);
    pad = tap(pad, 'b', LATER);
    expect(
      settleSection(pad.rewards, pad.goals.entries, TODAY, TODAY, after(SETTLE_MS, LATER)).outcome,
    ).toBe('rewarded');
  });

  it('achieves a past period without a reward moment', () => {
    const tapped = tap(
      {
        goals: goals({ entries: [entry({ id: 'y', periodKey: YESTERDAY })] }),
        rewards: NO_REWARDS,
      },
      'y',
      NOW,
    );
    expect(sectionStatus(tapped.rewards.settling, tapped.goals.entries, YESTERDAY)).toBe(
      'settling',
    );
    const settled = settleSection(tapped.rewards, tapped.goals.entries, YESTERDAY, TODAY, LATER);
    expect(settled).toEqual({ rewards: NO_REWARDS, outcome: 'achieved' });
  });

  it('settles and rewards each section on its own', () => {
    let pad = {
      goals: goals({
        entries: [
          entry({ id: 'd' }),
          entry({ id: 'w', cadence: 'weekly', periodKey: WEEK }),
          entry({ id: 'y', cadence: 'annual', periodKey: '2026' }),
        ],
      }),
      rewards: NO_REWARDS,
    };
    pad = tap(pad, 'd', NOW);
    expect(sectionStatus(pad.rewards.settling, pad.goals.entries, TODAY)).toBe('settling');
    expect(sectionStatus(pad.rewards.settling, pad.goals.entries, WEEK)).toBe('open');

    pad = {
      ...pad,
      rewards: settleSection(pad.rewards, pad.goals.entries, TODAY, TODAY, after(SETTLE_MS))
        .rewards,
    };
    pad = tap(pad, 'w', LATER);
    pad = tap(pad, 'y', LATER);
    const { entries } = pad.goals;
    const weekly = settleSection(pad.rewards, entries, WEEK, TODAY, after(SETTLE_MS, LATER));
    expect(weekly.outcome).toBe('rewarded');
    const annual = settleSection(weekly.rewards, entries, '2026', TODAY, after(SETTLE_MS, LATER));
    expect(annual.outcome).toBe('rewarded');
    expect(annual.rewards).toEqual({
      settling: {},
      played: { daily: TODAY, weekly: WEEK, annual: '2026' },
    });
  });

  it('lapses when the section is no longer complete by the time it settles', () => {
    const tapped = tap(lastGoalOpen(), 'b', NOW);
    const withNewLine = addGoal(
      tapped.goals,
      { cadence: 'daily', periodKey: TODAY, title: 'One more', targetCount: 1, repeats: false },
      after(500),
    );
    expect(sectionStatus(tapped.rewards.settling, withNewLine.entries, TODAY)).toBe('open');
    const settled = settleSection(tapped.rewards, withNewLine.entries, TODAY, TODAY, LATER);
    expect(settled).toEqual({ rewards: NO_REWARDS, outcome: 'lapsed' });
  });

  it('keeps settling through an edit that leaves the section complete', () => {
    const tapped = tap(lastGoalOpen(), 'b', NOW);
    const renamed = updateGoal(tapped.goals, 'a', { title: 'Renamed' }, TODAY, after(500));
    expect(msUntilSettled(tapped.rewards.settling[TODAY], after(500))).toBe(SETTLE_MS - 500);
    expect(
      settleSection(tapped.rewards, renamed.entries, TODAY, TODAY, after(SETTLE_MS)).outcome,
    ).toBe('rewarded');
  });

  it('achieves at once, with no reward moment, a section no tap completed', () => {
    const local = goals({ entries: [entry({ id: 'a', checks: ['empty'], updatedAt: NOW })] });
    const remote = goals({ entries: [entry({ id: 'a', checks: ['done'], updatedAt: LATER })] });
    const merged = mergeGoals(local, remote);
    expect(sectionStatus(NO_REWARDS.settling, merged.entries, TODAY)).toBe('achieved');
    expect(settleSection(NO_REWARDS, merged.entries, TODAY, TODAY, LATER)).toEqual({
      rewards: NO_REWARDS,
      outcome: 'lapsed',
    });
  });

  it('counts down to the moment a tap has rested', () => {
    expect(msUntilSettled(NOW, NOW)).toBe(SETTLE_MS);
    expect(msUntilSettled(NOW, after(SETTLE_MS - 200))).toBe(200);
    expect(msUntilSettled(NOW, LATER)).toBe(0);
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
    const state = updateGoal(recurring(), 'e1', { title: 'Deep Work' }, TODAY, NOW);
    expect(state.entries[0].title).toBe('Deep Work');
    expect(state.templates[0].title).toBe('Deep Work');
  });

  it('resizes checks preserving marks and carries the new count to future pages', () => {
    const grown = updateGoal(recurring(), 'e1', { targetCount: 5 }, TODAY, NOW);
    expect(grown.entries[0].checks).toEqual(['done', 'missed', 'empty', 'empty', 'empty']);
    expect(grown.templates[0].targetCount).toBe(5);

    const shrunk = updateGoal(recurring(), 'e1', { targetCount: 2 }, TODAY, NOW);
    expect(shrunk.entries[0].checks).toEqual(['done', 'missed']);

    const tomorrow = ensurePeriod(grown, 'daily', '2026-08-22', '2026-08-22');
    expect(tomorrow.entries[1].checks).toHaveLength(5);
  });

  it('leaves templates untouched for one-off lines and keeps the old title when blanked', () => {
    const start = goals({ templates: [template()], entries: [entry({ title: 'Keep me' })] });
    const renamed = updateGoal(start, 'e1', { title: 'Renamed' }, TODAY, NOW);
    expect(renamed.entries[0].title).toBe('Renamed');
    expect(renamed.templates).toBe(start.templates);

    expect(updateGoal(start, 'e1', { title: '   ' }, TODAY, NOW).entries[0].title).toBe('Keep me');
    expect(updateGoal(start, 'missing', { title: 'X' }, TODAY, NOW)).toBe(start);
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

    const labeled = updateGoal(
      start,
      'e1',
      { checkLabels: [' Legs', 'Push', 'Pull '] },
      TODAY,
      NOW,
    );
    expect(labeled.entries[0].checkLabels).toEqual(['Legs', 'Push', 'Pull']);
    expect(labeled.entries[0].checks).toEqual(['done', 'missed', 'empty']);
    expect(labeled.templates[0].checkLabels).toEqual(['Legs', 'Push', 'Pull']);
    expect(labeled.entries[1]).toBe(yesterday);

    const tomorrow = ensurePeriod(labeled, 'daily', '2026-08-22', '2026-08-22');
    expect(tomorrow.entries[2].checkLabels).toEqual(['Legs', 'Push', 'Pull']);
  });

  it('fits labels to a new count: shrink trims, grow leaves new boxes blank, one check drops them', () => {
    const labeled = updateGoal(
      recurring(),
      'e1',
      { checkLabels: ['Legs', 'Push', 'Pull'] },
      TODAY,
      NOW,
    );

    const shrunk = updateGoal(labeled, 'e1', { targetCount: 2 }, TODAY, NOW);
    expect(shrunk.entries[0].checkLabels).toEqual(['Legs', 'Push']);
    expect(shrunk.templates[0].checkLabels).toEqual(['Legs', 'Push']);

    const grown = updateGoal(labeled, 'e1', { targetCount: 5 }, TODAY, NOW);
    expect(grown.entries[0].checkLabels).toEqual(['Legs', 'Push', 'Pull', '', '']);
    expect(grown.entries[0].checks).toEqual(['done', 'missed', 'empty', 'empty', 'empty']);

    const single = updateGoal(labeled, 'e1', { targetCount: 1 }, TODAY, NOW);
    expect(single.entries[0].checkLabels).toBeUndefined();
    expect(single.templates[0].checkLabels).toBeUndefined();
  });

  it('stores all-blank labels as none, and keeps the labels when the patch omits them', () => {
    const labeled = updateGoal(
      recurring(),
      'e1',
      { checkLabels: ['Legs', 'Push', 'Pull'] },
      TODAY,
      NOW,
    );
    expect(updateGoal(labeled, 'e1', { title: 'Lift' }, TODAY, NOW).entries[0].checkLabels).toEqual(
      ['Legs', 'Push', 'Pull'],
    );

    const cleared = updateGoal(labeled, 'e1', { checkLabels: ['', ' ', ''] }, TODAY, NOW);
    expect(cleared.entries[0].checkLabels).toBeUndefined();
    expect(cleared.templates[0].checkLabels).toBeUndefined();
    expect(JSON.stringify(cleared)).not.toContain('checkLabels');
  });

  it('reschedules the template for future pages, leaving every line already written in place', () => {
    const yesterday = entry({
      id: 'y',
      templateId: 't1',
      periodKey: '2026-08-20',
      checks: ['done'],
    });
    const start = recurring();
    start.entries.push(yesterday);

    const weekend = updateGoal(start, 'e1', { weekdays: [6, 7] }, TODAY, NOW);
    expect(weekend.templates[0].weekdays).toEqual([6, 7]);
    expect(weekend.entries[0]).toMatchObject({
      id: 'e1',
      periodKey: TODAY,
      checks: ['done', 'missed', 'empty'],
    });
    expect(weekend.entries[1]).toBe(yesterday);

    expect(ensurePeriod(weekend, 'daily', '2026-08-22', '2026-08-22').entries).toHaveLength(3); // Sat
    expect(ensurePeriod(weekend, 'daily', '2026-08-24', '2026-08-24')).toBe(weekend); // Mon

    expect(updateGoal(weekend, 'e1', { title: 'Lift' }, TODAY, NOW).templates[0].weekdays).toEqual([
      6, 7,
    ]);
    const everyDay = updateGoal(weekend, 'e1', { weekdays: [...EVERY_WEEKDAY] }, TODAY, NOW);
    expect(everyDay.templates[0].weekdays).toBeUndefined();
  });
  describe('on a past page', () => {
    /** Today's line and yesterday's, both written from the template. */
    const withYesterday = () => {
      const start = recurring();
      start.entries.push(
        entry({
          id: 'y',
          templateId: 't1',
          periodKey: '2026-08-20',
          title: 'Daily Prod',
          checks: ['done', 'done', 'empty'],
        }),
      );
      return start;
    };

    it("changes that line alone: the template and today's line stay as they were", () => {
      const start = withYesterday();
      const edited = updateGoal(
        start,
        'y',
        { title: 'Deep Work', targetCount: 4, checkLabels: ['A', 'B', 'C', 'D'], weekdays: [6, 7] },
        TODAY,
        NOW,
      );

      expect(byId(edited, 'y')).toMatchObject({
        title: 'Deep Work',
        checks: ['done', 'done', 'empty', 'empty'],
        checkLabels: ['A', 'B', 'C', 'D'],
        countAt: NOW,
        updatedAt: NOW,
      });
      expect(edited.templates).toBe(start.templates);
      expect(byId(edited, 'e1')).toBe(start.entries[0]);
      expect(materializeToday(edited, TODAY)).toBe(edited);
    });

    it('neither stops a goal nor starts one, whatever the edit asks', () => {
      const start = withYesterday();
      expect(updateGoal(start, 'y', { repeats: false }, TODAY, NOW).templates).toBe(
        start.templates,
      );

      const oneOff = goals({ entries: [entry({ id: 'old', periodKey: '2026-08-20' })] });
      expect(updateGoal(oneOff, 'old', { repeats: true }, TODAY, NOW).templates).toEqual([]);
    });
  });

  describe('on the line that stands for its goal', () => {
    it('stops the goal in the same save when the edit turns Repeats off', () => {
      const saved = updateGoal(recurring(), 'e1', { title: 'Lift', repeats: false }, TODAY, NOW);
      expect(saved.entries[0]).toMatchObject({ title: 'Lift', templateId: 't1', updatedAt: NOW });
      expect(saved.templates[0]).toMatchObject({
        title: 'Lift',
        retiredAt: NOW,
        retiredOn: TODAY,
      });
    });

    it('starts a one-off repeating in the same save, on the weekdays chosen', () => {
      const start = goals({ entries: [entry({ title: 'Run' })] });
      const saved = updateGoal(
        start,
        'e1',
        { targetCount: 2, weekdays: [1, 3, 5], repeats: true },
        TODAY,
        NOW,
      );

      expect(saved.templates).toHaveLength(1);
      expect(saved.templates[0]).toMatchObject({
        title: 'Run',
        targetCount: 2,
        weekdays: [1, 3, 5],
      });
      expect(saved.entries[0].templateId).toBe(saved.templates[0].id);
    });

    it('leaves the goal as it is when the edit says what already holds, or nothing', () => {
      const start = recurring();
      expect(updateGoal(start, 'e1', { repeats: true }, TODAY, NOW).templates[0]).toBe(
        start.templates[0],
      );
      expect(
        updateGoal(start, 'e1', { title: 'Lift' }, TODAY, NOW).templates[0].retiredAt,
      ).toBeUndefined();
    });

    it('lets the latest line of a goal stand in for it on a day the goal skips', () => {
      const SATURDAY = '2026-08-22';
      const weekdays = [1, 2, 3, 4, 5];
      const line = (periodKey: string) =>
        entry({ id: `t1:${periodKey}`, templateId: 't1', periodKey, title: 'Daily Prod' });
      const start = goals({
        templates: [template({ title: 'Daily Prod', targetCount: 1, weekdays })],
        entries: [line('2026-08-20'), line('2026-08-21')],
      });

      const renamed = updateGoal(start, 't1:2026-08-21', { title: 'Deep Work' }, SATURDAY, NOW);
      expect(renamed.templates[0]).toMatchObject({ title: 'Deep Work', weekdays });

      const stopped = updateGoal(start, 't1:2026-08-21', { repeats: false }, SATURDAY, NOW);
      expect(stopped.templates[0]).toMatchObject({ retiredAt: NOW, retiredOn: SATURDAY });

      const earlier = updateGoal(start, 't1:2026-08-20', { title: 'Deep Work' }, SATURDAY, NOW);
      expect(earlier.templates).toBe(start.templates);
    });

    it('leaves a retired template alone when the line kept from a stopped goal is edited', () => {
      const stopped = stopRepeating(recurring(), 'e1', TODAY, NOW);
      const edited = updateGoal(stopped, 'e1', { title: 'Renamed', targetCount: 5 }, TODAY, LATER);
      expect(edited.entries[0]).toMatchObject({ title: 'Renamed', updatedAt: LATER });
      expect(edited.entries[0].checks).toHaveLength(5);
      expect(edited.templates).toBe(stopped.templates);
    });
  });
});

describe('managesGoal', () => {
  const YESTERDAY = '2026-08-20';
  const line = (periodKey: string, overrides: Partial<GoalEntry> = {}) =>
    entry({ id: `t1:${periodKey}`, templateId: 't1', periodKey, ...overrides });

  it('holds for any line on the current period of its cadence, recurring or not', () => {
    const start = goals({
      templates: [template()],
      entries: [
        line(TODAY),
        entry({ id: 'one-off' }),
        entry({ id: 'week', cadence: 'weekly', periodKey: '2026-W34' }),
      ],
    });
    expect(start.entries.map((e) => managesGoal(start, e, TODAY))).toEqual([true, true, true]);
    expect(managesGoal(start, start.entries[2], '2026-08-24')).toBe(false);
  });

  it('holds for no past line while the goal has a line on the current period', () => {
    const start = goals({ templates: [template()], entries: [line(YESTERDAY), line(TODAY)] });
    expect(managesGoal(start, start.entries[0], TODAY)).toBe(false);
  });

  it('holds for the latest line of a recurring goal with no line on the current period, and no earlier one', () => {
    const start = goals({
      templates: [template()],
      entries: [line('2026-08-19'), line(YESTERDAY)],
    });
    expect(start.entries.map((e) => managesGoal(start, e, TODAY))).toEqual([false, true]);
  });

  it('never holds for a past one-off line, nor for a past line kept from a stopped goal', () => {
    const start = goals({
      templates: [template({ retiredAt: NOW, retiredOn: YESTERDAY })],
      entries: [line(YESTERDAY), entry({ id: 'one-off', periodKey: YESTERDAY })],
    });
    expect(start.entries.map((e) => managesGoal(start, e, TODAY))).toEqual([false, false]);
    expect(start.entries.map((e) => isRecurring(start, e))).toEqual([false, false]);
  });
});

describe('clampChecks', () => {
  it('keeps a count between one check and the most a line holds', () => {
    expect([-2, 0, 1, 5, MAX_CHECKS, MAX_CHECKS + 3].map(clampChecks)).toEqual([
      1,
      1,
      1,
      5,
      MAX_CHECKS,
      MAX_CHECKS,
    ]);
  });
});

describe('moveEntry', () => {
  const YESTERDAY = '2026-08-20';
  const TOMORROW = '2026-08-22';

  /** One-off lines on a page, placed 1… in the order given; each line's id is its title. */
  function page(titles: string[], periodKey = TODAY): GoalEntry[] {
    return titles.map((title, i) => entry({ id: title, title, periodKey, sortOrder: i + 1 }));
  }

  /** A template and its line on today's page, each at its own place. */
  function recurring(title: string, linePlace: number, templatePlace = linePlace) {
    const id = title.toLowerCase();
    return {
      template: template({ id, title, targetCount: 1, sortOrder: templatePlace }),
      line: entry({
        id: materializedEntryId(id, TODAY),
        templateId: id,
        title,
        sortOrder: linePlace,
      }),
    };
  }

  it('moves a line up its section', () => {
    const start = goals({ entries: page(['Read', 'Walk', 'Write']) });
    expect(titlesOn(moveEntry(start, 'Write', 0, TODAY, NOW), TODAY)).toEqual([
      'Write',
      'Read',
      'Walk',
    ]);
    expect(titlesOn(moveEntry(start, 'Write', 1, TODAY, NOW), TODAY)).toEqual([
      'Read',
      'Write',
      'Walk',
    ]);
  });

  it('moves a line down its section', () => {
    const start = goals({ entries: page(['Read', 'Walk', 'Write']) });
    expect(titlesOn(moveEntry(start, 'Read', 1, TODAY, NOW), TODAY)).toEqual([
      'Walk',
      'Read',
      'Write',
    ]);
    expect(titlesOn(moveEntry(start, 'Read', 2, TODAY, NOW), TODAY)).toEqual([
      'Walk',
      'Write',
      'Read',
    ]);
  });

  it('writes the moved line alone, at a place between its new neighbors', () => {
    const start = goals({ entries: page(['Read', 'Walk', 'Write', 'Call']) });
    const moved = moveEntry(start, 'Call', 1, TODAY, NOW);
    expect(moved.entries.slice(0, 3)).toEqual(start.entries.slice(0, 3));
    expect(byId(moved, 'Read')).toBe(start.entries[0]);
    expect(byId(moved, 'Call')).toMatchObject({ sortOrder: 1.5, updatedAt: NOW });
  });

  it('keeps finding room as lines are moved into the same gap again and again', () => {
    let state = goals({ entries: page(['Read', 'Walk', 'Write', 'Call']) });
    for (let i = 0; i < 80; i += 1) {
      state = moveEntry(state, i % 2 ? 'Write' : 'Call', 1, TODAY, NOW);
    }
    expect(titlesOn(state, TODAY)).toEqual(['Read', 'Write', 'Call', 'Walk']);
    expect(byId(state, 'Read')?.updatedAt).toBe(EPOCH);
  });

  it('renumbers the section 1… when the neighbors share a place', () => {
    const [read, walk, write] = page(['Read', 'Walk', 'Write']);
    const start = goals({ entries: [read, { ...walk, sortOrder: 1 }, write] });
    const moved = moveEntry(start, 'Write', 1, TODAY, NOW);
    expect(entriesForPeriod(moved.entries, TODAY).map((e) => [e.title, e.sortOrder])).toEqual([
      ['Read', 1],
      ['Write', 2],
      ['Walk', 3],
    ]);
    expect(byId(moved, 'Walk')?.updatedAt).toBe(NOW);
  });

  it('settles a line dropped past either end on that end', () => {
    const start = goals({ entries: page(['Read', 'Walk', 'Write']) });
    expect(titlesOn(moveEntry(start, 'Read', 99, TODAY, NOW), TODAY)).toEqual([
      'Walk',
      'Write',
      'Read',
    ]);
    expect(titlesOn(moveEntry(start, 'Write', -5, TODAY, NOW), TODAY)).toEqual([
      'Write',
      'Read',
      'Walk',
    ]);
  });

  it('writes nothing for a line dropped where it was, or one not on the pad', () => {
    const start = goals({ entries: page(['Read', 'Walk']) });
    expect(moveEntry(start, 'Walk', 1, TODAY, NOW)).toBe(start);
    expect(moveEntry(start, 'Walk', 7, TODAY, NOW)).toBe(start);
    expect(moveEntry(start, 'nope', 0, TODAY, NOW)).toBe(start);
  });

  it('leaves every other period as it was', () => {
    const earlier = page(['Read', 'Walk'], YESTERDAY).map((e) => ({ ...e, id: `y:${e.id}` }));
    const start = goals({ entries: [...earlier, ...page(['Read', 'Walk'])] });
    const moved = moveEntry(start, 'Walk', 0, TODAY, NOW);
    expect(moved.entries.slice(0, 2)).toEqual(earlier);
    expect(titlesOn(moved, YESTERDAY)).toEqual(['Read', 'Walk']);
  });

  it('carries the move forward: the next period materializes the way this one was left', () => {
    const read = recurring('Read', 1);
    const walk = recurring('Walk', 2);
    const write = recurring('Write', 3);
    const start = goals({
      templates: [read.template, walk.template, write.template],
      entries: [read.line, walk.line, write.line],
    });

    const toTop = moveEntry(start, write.line.id, 0, TODAY, NOW);
    expect(titlesOn(materializeToday(toTop, TOMORROW), TOMORROW)).toEqual([
      'Write',
      'Read',
      'Walk',
    ]);
    const toMiddle = moveEntry(start, read.line.id, 1, TODAY, NOW);
    expect(titlesOn(materializeToday(toMiddle, TOMORROW), TOMORROW)).toEqual([
      'Walk',
      'Read',
      'Write',
    ]);
    expect(toMiddle.templates.slice(1)).toEqual(start.templates.slice(1));
    expect(toMiddle.templates[0]).toMatchObject({ sortOrder: 2.5, updatedAt: NOW });
  });

  it("places the template among the recurring lines' templates, past any one-off between them", () => {
    const read = recurring('Read', 1);
    const walk = recurring('Walk', 3);
    const call = entry({ id: 'Call', title: 'Call', sortOrder: 2 });
    const start = goals({
      templates: [read.template, walk.template],
      entries: [read.line, call, walk.line],
    });

    const moved = moveEntry(start, read.line.id, 2, TODAY, NOW);
    expect(titlesOn(moved, TODAY)).toEqual(['Call', 'Walk', 'Read']);
    expect(titlesOn(materializeToday(moved, TOMORROW), TOMORROW)).toEqual(['Walk', 'Read']);
  });

  it('writes no template when the recurring lines keep their order among themselves', () => {
    const read = recurring('Read', 1);
    const walk = recurring('Walk', 3);
    const call = entry({ id: 'Call', title: 'Call', sortOrder: 2 });
    const start = goals({
      templates: [read.template, walk.template],
      entries: [read.line, call, walk.line],
    });

    expect(moveEntry(start, 'Call', 0, TODAY, NOW).templates).toBe(start.templates);
    expect(moveEntry(start, walk.line.id, 1, TODAY, NOW).templates).toBe(start.templates);
  });

  it("renumbers the page's templates when their places no longer follow the page", () => {
    // A page whose order differs from its templates', as a retired star left it.
    const write = recurring('Write', 1, 3);
    const read = recurring('Read', 2, 1);
    const walk = recurring('Walk', 3, 2);
    const start = goals({
      templates: [read.template, walk.template, write.template],
      entries: [write.line, read.line, walk.line],
    });

    const moved = moveEntry(start, walk.line.id, 1, TODAY, NOW);
    expect(titlesOn(moved, TODAY)).toEqual(['Write', 'Walk', 'Read']);
    expect(titlesOn(materializeToday(moved, TOMORROW), TOMORROW)).toEqual([
      'Write',
      'Walk',
      'Read',
    ]);
  });

  it("carries a week's order into the next week", () => {
    const fitness = template({ id: 'fitness', cadence: 'weekly', title: 'Fitness', sortOrder: 1 });
    const prod = template({ id: 'prod', cadence: 'weekly', title: 'Weekly Prod', sortOrder: 2 });
    const start = materializeToday(goals({ templates: [fitness, prod] }), TODAY);

    const moved = moveEntry(start, 'prod:2026-W34', 0, TODAY, NOW);
    const nextWeek = materializeToday(moved, '2026-08-24');
    expect(titlesOn(nextWeek, '2026-W35')).toEqual(['Weekly Prod', 'Fitness']);
  });

  it("keeps a past page's order to itself", () => {
    const read = recurring('Read', 1);
    const walk = recurring('Walk', 2);
    const start = goals({
      templates: [read.template, walk.template],
      entries: [read.line, walk.line],
    });

    const moved = moveEntry(start, walk.line.id, 0, TOMORROW, NOW);
    expect(titlesOn(moved, TODAY)).toEqual(['Walk', 'Read']);
    expect(moved.templates).toBe(start.templates);
  });

  it('never writes a retired template, nor places another against it', () => {
    const read = recurring('Read', 1);
    const walk = recurring('Walk', 2);
    const write = recurring('Write', 3);
    const retired = { ...walk.template, retiredAt: NOW, updatedAt: NOW };
    const start = goals({
      templates: [read.template, retired, write.template],
      entries: [read.line, walk.line, write.line],
    });

    expect(moveEntry(start, walk.line.id, 0, TODAY, LATER).templates).toBe(start.templates);
    const moved = moveEntry(start, write.line.id, 0, TODAY, LATER);
    expect(moved.templates[1]).toBe(retired);
    expect(titlesOn(materializeToday(moved, TOMORROW), TOMORROW)).toEqual(['Write', 'Read']);
  });

  it('reaches another device through a merge, keeping what that device wrote on the lines it passed', () => {
    const phone = goals({ entries: page(['Read', 'Walk', 'Write']) });
    const ipad = cycleCheck(structuredClone(phone), 'Read', 0, NOW);

    const moved = moveEntry(phone, 'Write', 0, TODAY, LATER);
    const merged = mergeGoals(moved, ipad);
    expect(titlesOn(merged, TODAY)).toEqual(['Write', 'Read', 'Walk']);
    expect(byId(merged, 'Read')?.checks).toEqual(['done']);
    expect(mergeGoals(ipad, moved)).toEqual(merged);
  });

  it('leaves a retirement it has not heard of standing: the lines it passed stay untouched', () => {
    const read = template({ id: 'read', title: 'Read', targetCount: 1, sortOrder: 1 });
    const walk = template({ id: 'walk', title: 'Walk', targetCount: 1, sortOrder: 2 });
    const phone = materializeToday(goals({ templates: [read, walk] }), TODAY);
    const retired = removeGoal(phone, 'read:2026-08-21', TODAY, NOW);
    // The iPad, not yet having heard, writes tomorrow's page and moves Walk above Read's line.
    const ipad = materializeToday(structuredClone(phone), TOMORROW);
    const moved = moveEntry(ipad, 'walk:2026-08-22', 0, TOMORROW, '2026-08-22T09:00:00.000Z');

    const merged = mergeGoals(moved, retired);
    expect(titlesOn(merged, TOMORROW)).toEqual(['Walk']);
    expect(merged.templates.find((t) => t.id === 'read')?.retiredAt).toBe(NOW);
    expect(mergeGoals(retired, moved)).toEqual(merged);
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
    const state = removeGoal(start, 'a', TODAY, NOW);
    expect(state.entries.map((e) => e.id)).toEqual(['b']);
    expect(state.tombstones).toEqual({ a: NOW });
  });

  it("takes a past page's line off alone: the goal keeps repeating", () => {
    const yesterday = entry({ id: 't1:2026-08-20', templateId: 't1', periodKey: '2026-08-20' });
    const start = materializeToday(goals({ templates: [template()], entries: [yesterday] }), TODAY);

    const state = removeGoal(start, 't1:2026-08-20', TODAY, NOW);
    expect(byId(state, 't1:2026-08-20')).toBeUndefined();
    expect(state.tombstones).toEqual({ 't1:2026-08-20': NOW });
    expect(state.templates).toBe(start.templates);
    expect(materializeToday(state, '2026-08-22').entries.map((e) => e.id)).toEqual([
      't1:2026-08-21',
      't1:2026-08-22',
    ]);
  });

  it('retires a goal from its latest line on a day the goal skips', () => {
    const friday = entry({ id: 't1:2026-08-21', templateId: 't1' });
    const start = goals({
      templates: [template({ weekdays: [1, 2, 3, 4, 5] })],
      entries: [friday],
    });

    const state = removeGoal(start, 't1:2026-08-21', '2026-08-22', NOW);
    expect(state.templates[0]).toMatchObject({ retiredAt: NOW, retiredOn: '2026-08-22' });
  });

  it('retires a recurring goal so it returns to neither this page nor the next', () => {
    let state = ensurePeriod(goals({ templates: [template()] }), 'daily', TODAY, TODAY);
    state = removeGoal(state, state.entries[0].id, TODAY, NOW);
    expect(state.entries).toHaveLength(0);
    expect(state.templates[0]).toMatchObject({ retiredAt: NOW, retiredOn: TODAY, updatedAt: NOW });

    expect(ensurePeriod(state, 'daily', TODAY, TODAY)).toBe(state);
    expect(ensurePeriod(state, 'daily', '2026-08-22', '2026-08-22')).toBe(state);
  });

  it('ignores unknown entries', () => {
    const start = goals({ entries: [entry()] });
    expect(removeGoal(start, 'missing', TODAY, NOW)).toBe(start);
  });
});

describe('stopRepeating', () => {
  /** Yesterday's and today's lines of one recurring goal, today's with a check done. */
  function recurringGoal(): Goals {
    const yesterday = entry({
      id: 't1:2026-08-20',
      templateId: 't1',
      periodKey: '2026-08-20',
      title: 'Daily Prod',
      checks: ['done', 'missed'],
      updatedAt: '2026-08-20T09:00:00.000Z',
    });
    const written = materializeToday(
      goals({ templates: [template({ targetCount: 2 })], entries: [yesterday] }),
      TODAY,
    );
    return cycleCheck(written, 't1:2026-08-21', 0, NOW);
  }

  it('retires the template and keeps the line where it was written, with its checks', () => {
    const start = recurringGoal();
    const state = stopRepeating(start, 't1:2026-08-21', TODAY, LATER);

    expect(state.templates[0]).toMatchObject({
      retiredAt: LATER,
      retiredOn: TODAY,
      updatedAt: LATER,
    });
    expect(byId(state, 't1:2026-08-21')).toEqual({
      ...byId(start, 't1:2026-08-21'),
      updatedAt: LATER,
    });
    expect(byId(state, 't1:2026-08-21')).toMatchObject({
      templateId: 't1',
      checks: ['done', 'empty'],
    });
  });

  it('writes the goal on no later page and leaves past pages as they were', () => {
    const start = recurringGoal();
    const state = stopRepeating(start, 't1:2026-08-21', TODAY, LATER);

    expect(materializeToday(state, TODAY)).toBe(state);
    expect(materializeToday(state, '2026-08-22')).toBe(state);
    expect(byId(state, 't1:2026-08-20')).toBe(byId(start, 't1:2026-08-20'));
  });

  it('stops only the goal the line belongs to', () => {
    const start = materializeToday(
      goals({ templates: [template(), template({ id: 't2', title: 'Read', sortOrder: 2 })] }),
      TODAY,
    );
    const state = stopRepeating(start, 't1:2026-08-21', TODAY, NOW);
    expect(state.templates.map((t) => t.retiredAt)).toEqual([NOW, undefined]);
    expect(titlesOn(materializeToday(state, '2026-08-22'), '2026-08-22')).toEqual(['Read']);
  });

  it('ignores a one-off line, an unknown entry and a goal already stopped', () => {
    const start = goals({ templates: [template()], entries: [entry()] });
    expect(stopRepeating(start, 'e1', TODAY, NOW)).toBe(start);
    expect(stopRepeating(start, 'missing', TODAY, NOW)).toBe(start);

    const stopped = stopRepeating(recurringGoal(), 't1:2026-08-21', TODAY, NOW);
    expect(stopRepeating(stopped, 't1:2026-08-21', TODAY, LATER)).toBe(stopped);
  });

  it('keeps the moment of the stop when the kept line is crossed off later', () => {
    const stopped = stopRepeating(recurringGoal(), 't1:2026-08-21', TODAY, NOW);
    const removed = removeGoal(stopped, 't1:2026-08-21', TODAY, LATER);
    expect(byId(removed, 't1:2026-08-21')).toBeUndefined();
    expect(removed.templates[0]).toBe(stopped.templates[0]);
  });
});

describe('startRepeating', () => {
  const STARTED = startedTemplateId('e1', 1);

  it('makes a one-off line the first line of a new template, with its checks kept', () => {
    const line = entry({ checks: ['empty', 'empty'], checkLabels: ['AM', 'PM'], sortOrder: 3 });
    const start = cycleCheck(goals({ entries: [line] }), 'e1', 0, NOW);
    const state = startRepeating(start, 'e1', [5, 1, 3], LATER);

    expect(state.templates).toEqual([
      {
        id: STARTED,
        cadence: 'daily',
        title: 'One-off',
        targetCount: 2,
        checkLabels: ['AM', 'PM'],
        weekdays: [1, 3, 5],
        sortOrder: 3,
        updatedAt: LATER,
      },
    ]);
    expect(byId(state, 'e1')).toEqual({
      ...byId(start, 'e1'),
      templateId: STARTED,
      updatedAt: LATER,
    });
    expect(byId(state, 'e1')?.checks).toEqual(['done', 'empty']);
  });

  it('writes the goal on the next page and not a second time on its own', () => {
    const state = startRepeating(goals({ entries: [entry()] }), 'e1', undefined, NOW);

    expect(materializeToday(state, TODAY)).toBe(state);
    const tomorrow = materializeToday(state, '2026-08-22');
    expect(entriesForPeriod(tomorrow.entries, '2026-08-22')).toMatchObject([
      { id: materializedEntryId(STARTED, '2026-08-22'), templateId: STARTED, title: 'One-off' },
    ]);
  });

  it('writes no second line where the line was already carried over', () => {
    const yesterday = entry({ periodKey: '2026-08-20', title: 'Pay rent' });
    const carried = entry({
      id: carriedEntryId('e1', TODAY),
      title: 'Pay rent',
      carriedFrom: 'e1',
    });
    const start = goals({ entries: [yesterday, carried] });
    const state = startRepeating(start, 'e1', undefined, NOW);

    expect(materializeToday(state, TODAY)).toBe(state);
    expect(titlesOn(materializeToday(state, '2026-08-22'), '2026-08-22')).toEqual(['Pay rent']);
  });

  it('keeps a weekday schedule off a weekly goal', () => {
    const weekly = entry({ cadence: 'weekly', periodKey: '2026-W34' });
    const state = startRepeating(goals({ entries: [weekly] }), 'e1', [1, 3], NOW);
    expect(state.templates[0].weekdays).toBeUndefined();
  });

  it('starts a stopped goal as a new template and leaves the old one retired', () => {
    const written = materializeToday(goals({ templates: [template()] }), TODAY);
    const stopped = stopRepeating(written, 't1:2026-08-21', TODAY, NOW);
    const state = startRepeating(stopped, 't1:2026-08-21', undefined, LATER);
    const restarted = startedTemplateId('t1:2026-08-21', 1);

    expect(state.templates.map((t) => [t.id, t.retiredAt])).toEqual([
      ['t1', NOW],
      [restarted, undefined],
    ]);
    expect(byId(state, 't1:2026-08-21')?.templateId).toBe(restarted);
    const tomorrow = materializeToday(state, '2026-08-22');
    expect(entriesForPeriod(tomorrow.entries, '2026-08-22').map((e) => e.templateId)).toEqual([
      restarted,
    ]);
  });

  it('gives each start after a stop a template of its own', () => {
    const once = startRepeating(goals({ entries: [entry()] }), 'e1', undefined, NOW);
    const again = startRepeating(stopRepeating(once, 'e1', TODAY, LATER), 'e1', undefined, LATER);

    expect(again.templates.map((t) => [t.id, t.retiredAt])).toEqual([
      [STARTED, LATER],
      [startedTemplateId('e1', 2), undefined],
    ]);
    expect(byId(again, 'e1')?.templateId).toBe(startedTemplateId('e1', 2));
  });

  it('ignores a line that already repeats and an unknown entry', () => {
    const start = materializeToday(goals({ templates: [template()] }), TODAY);
    expect(startRepeating(start, 't1:2026-08-21', undefined, NOW)).toBe(start);
    expect(startRepeating(start, 'missing', undefined, NOW)).toBe(start);
  });
});

describe('suggestions', () => {
  const YESTERDAY = '2026-08-20';

  /** A one-off line on yesterday's page, its one check still empty. */
  function left(overrides: Partial<GoalEntry> = {}): GoalEntry {
    return entry({ periodKey: YESTERDAY, ...overrides });
  }

  function carryover(overrides: Partial<CarryoverSuggestion> = {}): CarryoverSuggestion {
    return {
      kind: 'carryover',
      sourceEntryId: 'e1',
      sourcePeriodKey: YESTERDAY,
      cadence: 'daily',
      title: 'One-off',
      targetCount: 1,
      checkLabels: undefined,
      ...overrides,
    };
  }

  function sourcesFor(state: Goals, day = TODAY) {
    return suggestionsFor(state, 'daily', day, day).map(suggestionSourceId);
  }

  describe('suggestionsFor', () => {
    it("offers yesterday's unfinished one-off lines for today, in their stored order", () => {
      const state = goals({
        entries: [
          left({
            id: 'b',
            title: 'Call the bank',
            checks: ['done', 'missed'],
            checkLabels: ['AM', 'PM'],
            sortOrder: 2,
          }),
          left({ id: 'a', title: 'Mow the lawn', sortOrder: 1 }),
        ],
      });
      expect(suggestionsFor(state, 'daily', TODAY, TODAY)).toEqual([
        carryover({ sourceEntryId: 'a', title: 'Mow the lawn' }),
        carryover({
          sourceEntryId: 'b',
          title: 'Call the bank',
          targetCount: 2,
          checkLabels: ['AM', 'PM'],
        }),
      ]);
    });

    it('never offers a recurring line or a line with every check done', () => {
      const state = goals({
        templates: [template()],
        entries: [
          left({ id: 't1:2026-08-20', templateId: 't1', title: 'Daily Prod' }),
          left({ id: 'done', title: 'Finished', checks: ['done', 'done'] }),
          left({ id: 'missed', title: 'Skipped', checks: ['missed'] }),
        ],
      });
      expect(sourcesFor(state)).toEqual(['missed']);
    });

    it('offers nothing on a past page', () => {
      const state = goals({ entries: [left({ id: 'old', periodKey: '2026-08-19' }), left()] });
      expect(suggestionsFor(state, 'daily', YESTERDAY, TODAY)).toEqual([]);
      expect(suggestionsFor(state, 'daily', '2026-08-22', TODAY)).toEqual([]);
    });

    it('reaches back to the most recent earlier page with any line, and no further', () => {
      const friday = goals({ entries: [left({ periodKey: '2026-08-14' })] });
      expect(suggestionsFor(friday, 'daily', TODAY, TODAY)).toEqual([
        carryover({ sourcePeriodKey: '2026-08-14' }),
      ]);

      const openedSince = goals({
        entries: [
          ...friday.entries,
          left({ id: 'later', title: 'Finished', periodKey: '2026-08-19', checks: ['done'] }),
        ],
      });
      expect(sourcesFor(openedSince)).toEqual([]);
      expect(sourcesFor(goals())).toEqual([]);
    });

    it("drops a line whose title is already written on today's page, whatever its case", () => {
      const state = goals({
        entries: [
          left({ id: 'a', title: 'Call the bank' }),
          left({ id: 'b', title: 'Mow the lawn' }),
          entry({ id: 'today', title: ' call the Bank ' }),
        ],
      });
      expect(sourcesFor(state)).toEqual(['b']);
    });

    it('carries each cadence over from its own earlier period', () => {
      const state = goals({
        entries: [
          left({ id: 'd' }),
          left({ id: 'w', cadence: 'weekly', periodKey: '2026-W33' }),
          left({ id: 'y', cadence: 'annual', periodKey: '2025' }),
        ],
      });
      expect(sourcesFor(state)).toEqual(['d']);
      expect(suggestionsFor(state, 'weekly', '2026-W34', TODAY)).toEqual([
        carryover({ sourceEntryId: 'w', sourcePeriodKey: '2026-W33', cadence: 'weekly' }),
      ]);
      expect(suggestionsFor(state, 'annual', '2026', TODAY)).toEqual([
        carryover({ sourceEntryId: 'y', sourcePeriodKey: '2025', cadence: 'annual' }),
      ]);
    });
  });

  describe('suggestionNote', () => {
    it('names the period a suggestion comes from, the one just before today by its everyday name', () => {
      expect(suggestionNote(carryover(), TODAY)).toBe('from yesterday');
      expect(suggestionNote(carryover({ sourcePeriodKey: '2026-08-14' }), TODAY)).toBe(
        'from Fri 8/14',
      );

      const weekly = (sourcePeriodKey: string) => carryover({ cadence: 'weekly', sourcePeriodKey });
      expect(suggestionNote(weekly('2026-W33'), TODAY)).toBe('from last week');
      expect(suggestionNote(weekly('2026-W31'), TODAY)).toBe('from an earlier week');
      // Mon 1/4/27 is in ISO week 2027-W01; the week before it is 2026-W53.
      expect(suggestionNote(weekly('2026-W53'), '2027-01-04')).toBe('from last week');

      const annual = (sourcePeriodKey: string) => carryover({ cadence: 'annual', sourcePeriodKey });
      expect(suggestionNote(annual('2025'), TODAY)).toBe('from last year');
      expect(suggestionNote(annual('2023'), TODAY)).toBe('from 2023');
    });
  });

  describe('acceptSuggestion', () => {
    /** Today's page with its recurring line written, and an unfinished labelled one-off yesterday. */
    function withUnfinished(): Goals {
      const source = left({
        id: 'a',
        title: 'Call the bank',
        checks: ['done', 'missed'],
        checkLabels: ['AM', 'PM'],
        updatedAt: '2026-08-20T09:00:00.000Z',
      });
      return materializeToday(goals({ templates: [template()], entries: [source] }), TODAY);
    }

    it("writes a fresh one-off line at the bottom of today's page, its checks empty", () => {
      const start = withUnfinished();
      const [suggestion] = suggestionsFor(start, 'daily', TODAY, TODAY);
      const state = acceptSuggestion(start, suggestion, TODAY, NOW);

      const [recurring, carried] = entriesForPeriod(state.entries, TODAY);
      expect(recurring.id).toBe('t1:2026-08-21');
      expect(carried).toEqual({
        id: 'a>2026-08-21',
        cadence: 'daily',
        periodKey: TODAY,
        title: 'Call the bank',
        checks: ['empty', 'empty'],
        checkLabels: ['AM', 'PM'],
        carriedFrom: 'a',
        sortOrder: 2,
        updatedAt: NOW,
      });
      expect(state.templates).toBe(start.templates);
    });

    it("leaves yesterday's line as written and stops offering it", () => {
      const start = withUnfinished();
      const [suggestion] = suggestionsFor(start, 'daily', TODAY, TODAY);
      const state = acceptSuggestion(start, suggestion, TODAY, NOW);

      expect(byId(state, 'a')).toBe(byId(start, 'a'));
      expect(sourcesFor(state)).toEqual([]);
      expect(acceptSuggestion(state, suggestion, TODAY, LATER)).toBe(state);
    });

    it('offers the carried line again on the next page while it stays unfinished', () => {
      const start = withUnfinished();
      const [suggestion] = suggestionsFor(start, 'daily', TODAY, TODAY);
      const state = acceptSuggestion(start, suggestion, TODAY, NOW);

      const tomorrow = materializeToday(state, '2026-08-22');
      const [again] = suggestionsFor(tomorrow, 'daily', '2026-08-22', '2026-08-22');
      expect(again).toEqual(
        carryover({
          sourceEntryId: 'a>2026-08-21',
          sourcePeriodKey: TODAY,
          title: 'Call the bank',
          targetCount: 2,
          checkLabels: ['AM', 'PM'],
        }),
      );

      // Carried over a second time, the line keeps the first entry's id as its root.
      const carriedTwice = acceptSuggestion(tomorrow, again, '2026-08-22', LATER);
      expect(byId(carriedTwice, 'a>2026-08-22')).toMatchObject({ carriedFrom: 'a>2026-08-21' });
    });

    it('keeps a carried line that was crossed off from being offered or written again', () => {
      const start = withUnfinished();
      const [suggestion] = suggestionsFor(start, 'daily', TODAY, TODAY);
      const crossedOff = removeGoal(
        acceptSuggestion(start, suggestion, TODAY, NOW),
        'a>2026-08-21',
        TODAY,
        LATER,
      );
      expect(sourcesFor(crossedOff)).toEqual([]);
      expect(acceptSuggestion(crossedOff, suggestion, TODAY, LATER)).toBe(crossedOff);
    });
  });

  describe('declineSuggestion', () => {
    it('stops offering the line and leaves it as written', () => {
      const start = goals({ entries: [left({ id: 'a' }), left({ id: 'b', title: 'Other' })] });
      const state = declineSuggestion(start, 'a');
      expect(state.declinedSuggestions).toEqual(['a']);
      expect(state.entries).toBe(start.entries);
      expect(sourcesFor(state)).toEqual(['b']);
    });

    it('keeps the declined ids sorted and ignores a repeat', () => {
      const state = declineSuggestion(declineSuggestion(goals(), 'b'), 'a');
      expect(state.declinedSuggestions).toEqual(['a', 'b']);
      expect(declineSuggestion(state, 'b')).toBe(state);
    });

    it('stays declined through a later write elsewhere on the pad', () => {
      const declined = declineSuggestion(goals({ entries: [left({ id: 'a' }), entry()] }), 'a');
      expect(removeGoal(declined, 'e1', TODAY, NOW).declinedSuggestions).toEqual(['a']);
      expect(cycleCheck(declined, 'e1', 0, NOW).declinedSuggestions).toEqual(['a']);
    });
  });

  describe('due reminders as a source', () => {
    function reminder(overrides: Partial<Reminder> = {}): Reminder {
      return { id: 'r1', title: 'Buy stamps', completed: false, dueDay: TODAY, ...overrides };
    }

    function fromReminders(overrides: Partial<ReminderSuggestion> = {}): ReminderSuggestion {
      return {
        kind: 'reminder',
        sourceReminderId: 'r1',
        cadence: 'daily',
        title: 'Buy stamps',
        targetCount: 1,
        ...overrides,
      };
    }

    function offered(state: Goals, reminders: Reminder[], day = TODAY) {
      return suggestionsFor(state, 'daily', day, day, reminders);
    }

    it('offers reminders due today or earlier, the longest due first, and none due later or undated', () => {
      const list = [
        reminder({ id: 'r1', title: 'Due today' }),
        reminder({ id: 'r2', title: 'Due tomorrow', dueDay: '2026-08-22' }),
        reminder({ id: 'r3', title: 'Overdue', dueDay: '2026-08-19' }),
        reminder({ id: 'r4', title: 'No date', dueDay: undefined }),
        reminder({ id: 'r5', title: 'Long overdue', dueDay: '2025-12-31' }),
      ];
      expect(offered(goals(), list).map(suggestionSourceId)).toEqual(['r5', 'r3', 'r1']);
    });

    it("offers the unfinished due reminders on today's daily section, after the carryovers", () => {
      const state = goals({ entries: [left()] });
      const list = [reminder(), reminder({ id: 'r2', title: ' Renew passport ' })];
      expect(offered(state, list)).toEqual([
        carryover(),
        fromReminders(),
        fromReminders({ sourceReminderId: 'r2', title: 'Renew passport' }),
      ]);
      expect(suggestionNote(fromReminders(), TODAY)).toBe('from Reminders');
      expect(offered(goals(), list).map(suggestionSourceId)).toEqual(['r1', 'r2']);
    });

    it('never offers a finished or untitled reminder, or one whose title is on the page', () => {
      const state = goals({ entries: [entry({ title: 'buy Stamps' })] });
      const list = [
        reminder(),
        reminder({ id: 'r2', title: 'Finished', completed: true }),
        reminder({ id: 'r3', title: '  ' }),
        reminder({ id: 'r4', title: 'Renew passport' }),
      ];
      expect(offered(state, list).map(suggestionSourceId)).toEqual(['r4']);
    });

    it('offers reminders on no other section and no other page', () => {
      const list = [reminder()];
      expect(suggestionsFor(goals(), 'weekly', '2026-W34', TODAY, list)).toEqual([]);
      expect(suggestionsFor(goals(), 'annual', '2026', TODAY, list)).toEqual([]);
      expect(suggestionsFor(goals(), 'daily', YESTERDAY, TODAY, list)).toEqual([]);
    });

    it('writes an accepted reminder as a linked one-off line and stops offering it', () => {
      const start = materializeToday(goals({ templates: [template()] }), TODAY);
      const [suggestion] = offered(start, [reminder()]);
      const state = acceptSuggestion(start, suggestion, TODAY, NOW);

      expect(entriesForPeriod(state.entries, TODAY)[1]).toEqual({
        id: 'r1>2026-08-21',
        cadence: 'daily',
        periodKey: TODAY,
        title: 'Buy stamps',
        checks: ['empty'],
        reminderId: 'r1',
        sortOrder: 2,
        updatedAt: NOW,
      });
      expect(offered(state, [reminder()])).toEqual([]);
      expect(acceptSuggestion(state, suggestion, TODAY, LATER)).toBe(state);
    });

    it('stops offering a reminder for good once any line is linked to it, finished or not', () => {
      const [suggestion] = offered(goals(), [reminder()]);
      const linked = acceptSuggestion(goals(), suggestion, TODAY, NOW);
      const finished = cycleCheck(linked, 'r1>2026-08-21', 0, LATER);
      // The reminder is still unfinished in Reminders the next morning; the pad already has it.
      expect(sourcesFor(finished, '2026-08-22')).toEqual([]);
      expect(offered(finished, [reminder()], '2026-08-22')).toEqual([]);
    });

    it('offers a line linked yesterday and left unfinished once, as a carryover that stays linked', () => {
      const [suggestion] = offered(goals(), [reminder()]);
      const linked = acceptSuggestion(goals(), suggestion, TODAY, NOW);

      const [again, ...rest] = offered(linked, [reminder()], '2026-08-22');
      expect(rest).toEqual([]);
      expect(again).toEqual(
        carryover({
          sourceEntryId: 'r1>2026-08-21',
          sourcePeriodKey: TODAY,
          title: 'Buy stamps',
          reminderId: 'r1',
        }),
      );

      const carried = acceptSuggestion(linked, again, '2026-08-22', LATER);
      expect(byId(carried, 'r1>2026-08-22')).toMatchObject({
        carriedFrom: 'r1>2026-08-21',
        reminderId: 'r1',
        checks: ['empty'],
      });
      expect(offered(carried, [reminder()], '2026-08-22')).toEqual([]);
    });

    it('offers a goal both sources hold under one title once, as the carryover', () => {
      const state = goals({ entries: [left({ id: 'a', title: 'Buy Stamps' })] });
      expect(offered(state, [reminder()])).toEqual([
        carryover({ sourceEntryId: 'a', title: 'Buy Stamps' }),
      ]);
    });

    it('never offers a declined reminder again', () => {
      const state = declineSuggestion(goals(), 'r1');
      expect(state.declinedSuggestions).toEqual(['r1']);
      expect(offered(state, [reminder(), reminder({ id: 'r2', title: 'Other' })])).toEqual([
        fromReminders({ sourceReminderId: 'r2', title: 'Other' }),
      ]);
    });

    it('keeps a reminder off the page it was crossed off, and offers it again the next day', () => {
      const [suggestion] = offered(goals(), [reminder()]);
      const crossedOff = removeGoal(
        acceptSuggestion(goals(), suggestion, TODAY, NOW),
        'r1>2026-08-21',
        TODAY,
        LATER,
      );
      expect(offered(crossedOff, [reminder()])).toEqual([]);
      expect(acceptSuggestion(crossedOff, suggestion, TODAY, LATER)).toBe(crossedOff);
      expect(offered(crossedOff, [reminder()], '2026-08-22')).toEqual([fromReminders()]);
    });
  });
});

describe('identity across devices', () => {
  it('gives a carried-over line the same id on every device: its first entry and period', () => {
    expect(carriedEntryId('a', TODAY)).toBe('a>2026-08-21');
    expect(carriedEntryId('a>2026-08-21', '2026-08-22')).toBe('a>2026-08-22');
  });

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

    const edited = updateGoal(start, 'e1', { title: 'Deep Work' }, TODAY, NOW);
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
    const removed = removeGoal(phone, 't1:2026-08-21', TODAY, NOW);
    const merged = mergeGoals(ipad, removed);
    expect(merged.entries).toHaveLength(0);
    expect(merged.tombstones).toEqual({ 't1:2026-08-21': NOW });
    expect(merged.templates[0].retiredAt).toBe(NOW);
    expect(materializeToday(merged, TODAY)).toBe(merged);
  });

  it('lets a write after a removal revive the line, and a removal after a write remove it', () => {
    const [phone, ipad] = twoDevices();
    const removedFirst = removeGoal(phone, 't1:2026-08-21', TODAY, NOW);
    const tappedLater = cycleCheck(ipad, 't1:2026-08-21', 0, LATER);
    expect(mergeGoals(removedFirst, tappedLater).entries).toHaveLength(1);
    expect(mergeGoals(removedFirst, tappedLater).tombstones).toEqual({});

    const tappedFirst = cycleCheck(ipad, 't1:2026-08-21', 0, NOW);
    const removedLater = removeGoal(phone, 't1:2026-08-21', TODAY, LATER);
    expect(mergeGoals(tappedFirst, removedLater).entries).toHaveLength(0);
  });

  it('drops the line a stale device wrote for a template after it was retired', () => {
    const [phone, ipad] = twoDevices();
    const retired = removeGoal(phone, 't1:2026-08-21', TODAY, NOW);
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
    const retired = removeGoal(phone, 't1:2026-08-21', TODAY, NOW);
    const ghostTapped = cycleCheck(
      ensurePeriod(yesterday, 'daily', '2026-08-22', '2026-08-22'),
      't1:2026-08-22',
      0,
      LATER,
    );
    const merged = mergeGoals(retired, ghostTapped);
    expect(merged.entries.map((e) => e.id)).toEqual(['t1:2026-08-20', 't1:2026-08-22']);
  });

  it('keeps a stopped goal stopped, and its line, against a device that has not heard', () => {
    const [phone, ipad] = twoDevices();
    const stopped = stopRepeating(
      cycleCheck(phone, 't1:2026-08-21', 0, NOW),
      't1:2026-08-21',
      TODAY,
      LATER,
    );
    // The iPad still holds the live template and an untouched line, and writes tomorrow's page from them.
    const stale = ensurePeriod(ipad, 'daily', '2026-08-22', '2026-08-22');
    expect(byId(stale, 't1:2026-08-22')).toBeDefined();

    const merged = mergeGoals(stale, stopped);
    expect(merged.entries.map((e) => e.id)).toEqual(['t1:2026-08-21']);
    expect(byId(merged, 't1:2026-08-21')?.checks).toEqual(['done', 'empty']);
    expect(merged.templates[0].retiredAt).toBe(LATER);
    expect(merged).toEqual(mergeGoals(stopped, stale));
    expect(materializeToday(merged, '2026-08-22')).toBe(merged);
  });

  it('keeps the kept line of a stopped goal when a stale device writes on it afterwards', () => {
    const [phone, ipad] = twoDevices();
    const stopped = stopRepeating(phone, 't1:2026-08-21', TODAY, NOW);
    const tappedLater = cycleCheck(ipad, 't1:2026-08-21', 1, LATER);

    const merged = mergeGoals(stopped, tappedLater);
    expect(byId(merged, 't1:2026-08-21')?.checks).toEqual(['empty', 'done']);
    expect(merged.templates[0].retiredAt).toBe(NOW);
    expect(merged).toEqual(mergeGoals(tappedLater, stopped));
  });

  it('keeps a goal stopped when a stale device edits it after the stop', () => {
    const [phone, ipad] = twoDevices();
    const stopped = stopRepeating(phone, 't1:2026-08-21', TODAY, NOW);
    // The iPad, not yet having heard, renames the goal: its live template is the later write.
    const renamed = updateGoal(ipad, 't1:2026-08-21', { title: 'Deep Work' }, TODAY, LATER);
    expect(renamed.templates[0].retiredAt).toBeUndefined();

    const merged = mergeGoals(stopped, renamed);
    expect(merged.templates[0]).toMatchObject({ title: 'Deep Work', retiredAt: NOW });
    expect(titlesOn(merged, TODAY)).toEqual(['Deep Work']);
    expect(merged).toEqual(mergeGoals(renamed, stopped));
    expect(mergeGoals(merged, renamed)).toEqual(merged);
    expect(materializeToday(merged, '2026-08-22')).toBe(merged);
  });

  it('starts a goal once when two devices turn Repeats on for the same line', () => {
    const pad = goals({ entries: [entry()] });
    const onPhone = startRepeating(pad, 'e1', undefined, NOW);
    const onIpad = startRepeating(structuredClone(pad), 'e1', [1, 3], LATER);

    const merged = mergeGoals(onPhone, onIpad);
    expect(merged.templates).toEqual(onIpad.templates);
    expect(merged).toEqual(mergeGoals(onIpad, onPhone));
    expect(titlesOn(materializeToday(merged, '2026-08-24'), '2026-08-24')).toEqual(['One-off']);
  });

  it('writes a started goal once on its page when a stale device writes on the line later', () => {
    const pad = goals({ entries: [entry()] });
    const started = startRepeating(pad, 'e1', undefined, NOW);
    const tappedLater = cycleCheck(structuredClone(pad), 'e1', 0, LATER);

    const merged = mergeGoals(started, tappedLater);
    expect(byId(merged, 'e1')).toEqual(byId(tappedLater, 'e1'));
    expect(merged).toEqual(mergeGoals(tappedLater, started));
    expect(materializeToday(merged, TODAY)).toBe(merged);
    expect(titlesOn(materializeToday(merged, '2026-08-22'), '2026-08-22')).toEqual(['One-off']);

    const AGAIN = '2026-08-21T11:00:00.000Z';
    const relinked = startRepeating(merged, 'e1', [1, 3], AGAIN);
    expect(relinked.templates).toEqual([
      { ...merged.templates[0], weekdays: [1, 3], updatedAt: AGAIN },
    ]);
    expect(byId(relinked, 'e1')?.templateId).toBe(startedTemplateId('e1', 1));
  });

  it('leaves a started goal stopped when another device starts it before hearing of the stop', () => {
    const pad = goals({ entries: [entry()] });
    const stopped = stopRepeating(startRepeating(pad, 'e1', undefined, NOW), 'e1', TODAY, LATER);
    const startedLater = startRepeating(
      structuredClone(pad),
      'e1',
      undefined,
      '2026-08-21T11:00:00.000Z',
    );

    const merged = mergeGoals(stopped, startedLater);
    expect(merged.templates.map((t) => [t.id, t.retiredAt])).toEqual([
      [startedTemplateId('e1', 1), LATER],
    ]);
    expect(merged).toEqual(mergeGoals(startedLater, stopped));
    expect(materializeToday(merged, '2026-08-22')).toBe(merged);

    const again = startRepeating(merged, 'e1', undefined, '2026-08-21T12:00:00.000Z');
    expect(byId(again, 'e1')?.templateId).toBe(startedTemplateId('e1', 2));
  });

  it('keeps the first retirement when both devices retire the same goal', () => {
    const [phone, ipad] = twoDevices();
    const stoppedFirst = stopRepeating(phone, 't1:2026-08-21', TODAY, NOW);
    const removedLater = removeGoal(ipad, 't1:2026-08-21', '2026-08-22', LATER);
    const first = { retiredAt: NOW, retiredOn: TODAY };
    expect(mergeGoals(stoppedFirst, removedLater).templates[0]).toMatchObject(first);
    expect(mergeGoals(removedLater, stoppedFirst).templates[0]).toMatchObject(first);
  });

  it('reads a retirement by the day it was made on, not the day its stamp falls on here', () => {
    const [phone, ipad] = twoDevices();
    const eveningOfThe21stWestOfUtc = '2026-08-22T01:00:00.000Z';
    const retired = removeGoal(phone, 't1:2026-08-21', TODAY, eveningOfThe21stWestOfUtc);
    const tomorrow = ensurePeriod(ipad, 'daily', '2026-08-22', '2026-08-22');

    const merged = mergeGoals(tomorrow, retired);
    expect(merged.entries).toHaveLength(0);
    expect(merged).toEqual(mergeGoals(retired, tomorrow));
  });

  it('keeps the line of the day a goal was retired on when its stamp falls on the day before', () => {
    const [, ipad] = twoDevices();
    const morningOfThe21stEastOfUtc = '2026-08-20T22:00:00.000Z';
    const stopped = goals({
      templates: [
        template({
          retiredAt: morningOfThe21stEastOfUtc,
          retiredOn: TODAY,
          updatedAt: morningOfThe21stEastOfUtc,
        }),
      ],
    });

    const merged = mergeGoals(ipad, stopped);
    expect(merged.entries.map((e) => e.id)).toEqual(['t1:2026-08-21']);
    expect(merged).toEqual(mergeGoals(stopped, ipad));
  });

  it('records the day of a retirement made before days were, the earlier where two copies differ', () => {
    const noon = '2026-08-21T12:00:00.000Z';
    const undated = goals({ templates: [template({ retiredAt: noon, updatedAt: noon })] });
    const onThisDevicesCalendar = dayKeyOf(new Date(noon));
    expect(mergeGoals(undated, undated).templates[0].retiredOn).toBe(onThisDevicesCalendar);

    const readAs = (retiredOn: string) =>
      goals({ templates: [template({ retiredAt: noon, retiredOn, updatedAt: noon })] });
    const merged = mergeGoals(readAs('2026-08-22'), readAs(TODAY));
    expect(merged.templates[0].retiredOn).toBe(TODAY);
    expect(merged).toEqual(mergeGoals(readAs(TODAY), readAs('2026-08-22')));
    const earlierThanAnyZoneReadsNoon = '2026-08-19';
    expect(mergeGoals(undated, readAs(earlierThanAnyZoneReadsNoon)).templates[0].retiredOn).toBe(
      earlierThanAnyZoneReadsNoon,
    );
  });

  it('keeps a suggestion declined on either device declined, in one canonical order', () => {
    const [phone, ipad] = twoDevices();
    const onPhone = declineSuggestion(phone, 'b');
    const onIpad = declineSuggestion(ipad, 'a');

    const merged = mergeGoals(onPhone, onIpad);
    expect(merged.declinedSuggestions).toEqual(['a', 'b']);
    expect(merged).toEqual(mergeGoals(onIpad, onPhone));
    expect(mergeGoals(merged, onPhone)).toEqual(merged);
    expect('declinedSuggestions' in mergeGoals(phone, ipad)).toBe(false);
  });

  it('carries a line accepted on one device to the other, where it is no longer offered', () => {
    const [phone, ipad] = twoDevices().map((device) => ({
      ...device,
      entries: [...device.entries, entry({ id: 'a', periodKey: '2026-08-20' })],
    }));
    const [suggestion] = suggestionsFor(phone, 'daily', TODAY, TODAY);
    const merged = mergeGoals(ipad, acceptSuggestion(phone, suggestion, TODAY, NOW));

    expect(titlesOn(merged, TODAY)).toEqual(['Daily Prod', 'One-off']);
    expect(suggestionsFor(merged, 'daily', TODAY, TODAY)).toEqual([]);
  });

  it('sees one line where both devices accepted the same suggestion', () => {
    const [phone, ipad] = twoDevices().map((device) => ({
      ...device,
      entries: [...device.entries, entry({ id: 'a', periodKey: '2026-08-20' })],
    }));
    const [suggestion] = suggestionsFor(phone, 'daily', TODAY, TODAY);
    const onPhone = acceptSuggestion(phone, suggestion, TODAY, NOW);
    const onIpad = acceptSuggestion(ipad, suggestion, TODAY, LATER);

    const merged = mergeGoals(onPhone, onIpad);
    expect(titlesOn(merged, TODAY)).toEqual(['Daily Prod', 'One-off']);
    expect(merged).toEqual(mergeGoals(onIpad, onPhone));
  });

  it('is idempotent and canonical, so a device with nothing new pushes nothing', () => {
    const [phone, ipad] = twoDevices();
    const merged = mergeGoals(cycleCheck(phone, 't1:2026-08-21', 0, NOW), ipad);
    expect(mergeGoals(merged, ipad)).toEqual(merged);
    expect(mergeGoals(ipad, merged)).toEqual(merged);
  });

  it("carries a template's weekdays through a merge, the later schedule winning", () => {
    const [phone, ipad] = twoDevices();
    const onPhone = updateGoal(phone, 't1:2026-08-21', { weekdays: [1, 3, 5] }, TODAY, NOW);
    expect(mergeGoals(onPhone, ipad).templates[0].weekdays).toEqual([1, 3, 5]);
    expect(mergeGoals(ipad, onPhone).templates[0].weekdays).toEqual([1, 3, 5]);

    const onIpad = updateGoal(ipad, 't1:2026-08-21', { weekdays: [2, 4] }, TODAY, LATER);
    expect(mergeGoals(onPhone, onIpad).templates[0].weekdays).toEqual([2, 4]);
  });
});

/**
 * How a line came to show more checks than its goal is set to (#101): a write
 * from a copy that had not heard the count changed won its whole row. The
 * count now merges by its own stamp.
 */
describe('the check count a line ends up with', () => {
  const YESTERDAY = '2026-08-20';
  const TOMORROW = '2026-08-22';
  const LAST_NIGHT = '2026-08-20T20:00:00.000Z';
  const EARLIER = '2026-08-21T08:00:00.000Z';
  const YESTERDAY_LINE = `t1:${YESTERDAY}`;
  const TODAY_LINE = `t1:${TODAY}`;

  /** The pad every device starts from: a recurring three-check goal and yesterday's line of it. */
  const shared = () =>
    goals({
      templates: [
        template({
          id: 't1',
          title: 'Deep Work',
          targetCount: 3,
          updatedAt: '2026-08-19T09:00:00.000Z',
        }),
      ],
      entries: [
        entry({
          id: YESTERDAY_LINE,
          templateId: 't1',
          periodKey: YESTERDAY,
          title: 'Deep Work',
          checks: ['empty', 'empty', 'empty'],
        }),
      ],
    });

  const checkCount = (state: Goals, id: string) => byId(state, id)?.checks.length;
  const targetCount = (state: Goals) => state.templates.find((t) => t.id === 't1')?.targetCount;
  /** A merge as a device's store applies it, from either side. */
  const mergedBothWays = (a: Goals, b: Goals) =>
    [mergeGoals(a, b), mergeGoals(b, a)].map((merged) => materializeToday(merged, TODAY));

  describe('when one device changed the count last night and the other has not heard', () => {
    const lowered = () =>
      updateGoal(shared(), YESTERDAY_LINE, { targetCount: 2 }, YESTERDAY, LAST_NIGHT);
    const stale = () => materializeToday(shared(), TODAY);

    it('keeps the lowered count when both wrote today untouched', () => {
      for (const merged of mergedBothWays(materializeToday(lowered(), TODAY), stale())) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });

    it('keeps the lowered count when the stale device tapped a check on its line', () => {
      const tapped = cycleCheck(stale(), TODAY_LINE, 0, NOW);
      for (const merged of mergedBothWays(materializeToday(lowered(), TODAY), tapped)) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });

    it('keeps the lowered count when only the stale device has written today', () => {
      for (const merged of mergedBothWays(lowered(), stale())) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });

    it('keeps the lowered count when only the stale device wrote today, and tapped it', () => {
      const tapped = cycleCheck(stale(), TODAY_LINE, 0, NOW);
      for (const merged of mergedBothWays(lowered(), tapped)) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });

    it('keeps a raised count when both wrote today untouched', () => {
      const raised = updateGoal(
        shared(),
        YESTERDAY_LINE,
        { targetCount: 4 },
        YESTERDAY,
        LAST_NIGHT,
      );
      for (const merged of mergedBothWays(materializeToday(raised, TODAY), stale())) {
        expect(checkCount(merged, TODAY_LINE)).toBe(4);
      }
    });

    it('keeps the lowered count when the stale device renames its line of today', () => {
      const renamed = updateGoal(stale(), TODAY_LINE, { title: 'Deep work' }, TODAY, NOW);
      for (const merged of mergedBothWays(materializeToday(lowered(), TODAY), renamed)) {
        expect(targetCount(merged)).toBe(2);
        expect(checkCount(materializeToday(merged, TOMORROW), `t1:${TOMORROW}`)).toBe(2);
      }
    });
  });

  describe("when one device lowers the count on today's line", () => {
    const lowered = () =>
      updateGoal(materializeToday(shared(), TODAY), TODAY_LINE, { targetCount: 2 }, TODAY, NOW);
    const other = () => materializeToday(shared(), TODAY);

    it("keeps the lowered count over the other device's untouched line", () => {
      for (const merged of mergedBothWays(lowered(), other())) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });

    it('keeps the lowered count over a check the other device tapped before', () => {
      const tappedBefore = cycleCheck(other(), TODAY_LINE, 0, EARLIER);
      for (const merged of mergedBothWays(lowered(), tappedBefore)) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });

    it('keeps the lowered count over a check the other device tapped after, unheard', () => {
      const tappedAfter = cycleCheck(other(), TODAY_LINE, 0, LATER);
      for (const merged of mergedBothWays(lowered(), tappedAfter)) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });
  });

  describe('when a device upgrades from before stamps holding the old count', () => {
    /** Its template sits at a place no seed holds, so the upgrade keeps the id both devices share. */
    const legacy = (): LegacyGoals => ({
      templates: [
        {
          id: 't1',
          cadence: 'daily',
          title: 'Deep Work',
          targetCount: 3,
          sortOrder: 7,
          active: true,
        },
      ],
      entries: [
        {
          id: 'old-today',
          templateId: 't1',
          cadence: 'daily',
          periodKey: TODAY,
          title: 'Deep Work',
          checks: ['empty', 'empty', 'empty'],
          sortOrder: 1,
        },
      ],
    });
    const lowered = () =>
      materializeToday(
        updateGoal(shared(), YESTERDAY_LINE, { targetCount: 2 }, YESTERDAY, LAST_NIGHT),
        TODAY,
      );

    it("keeps the lowered count on the template against the upgraded device's", () => {
      for (const merged of mergedBothWays(lowered(), upgradeLegacyGoals(legacy()))) {
        expect(targetCount(merged)).toBe(2);
        expect(checkCount(materializeToday(merged, TOMORROW), `t1:${TOMORROW}`)).toBe(2);
      }
    });

    it("keeps the lowered count on today's line against the upgraded device's", () => {
      for (const merged of mergedBothWays(lowered(), upgradeLegacyGoals(legacy()))) {
        expect(checkCount(merged, TODAY_LINE)).toBe(2);
      }
    });
  });
});

describe("a check count's own stamp", () => {
  const TOMORROW = '2026-08-22';
  const TODAY_LINE = `t1:${TODAY}`;
  const written = () =>
    materializeToday(goals({ templates: [template({ targetCount: 3 })] }), TODAY);

  it('is set on the line and its template by an edit that changes the count, and by no other', () => {
    const renamed = updateGoal(written(), TODAY_LINE, { title: 'Deep Work' }, TODAY, NOW);
    expect(byId(renamed, TODAY_LINE)?.countAt).toBeUndefined();
    expect(renamed.templates[0].countAt).toBeUndefined();

    const resized = updateGoal(renamed, TODAY_LINE, { targetCount: 2 }, TODAY, LATER);
    expect(byId(resized, TODAY_LINE)?.countAt).toBe(LATER);
    expect(resized.templates[0]).toMatchObject({ targetCount: 2, countAt: LATER });

    const tapped = cycleCheck(resized, TODAY_LINE, 0, '2026-08-21T11:00:00.000Z');
    expect(byId(tapped, TODAY_LINE)?.countAt).toBe(LATER);
  });

  it('goes with the count onto each line the template writes, and onto a template started from a line', () => {
    const resized = updateGoal(written(), TODAY_LINE, { targetCount: 2 }, TODAY, NOW);
    const tomorrow = materializeToday(resized, TOMORROW);
    expect(byId(tomorrow, `t1:${TOMORROW}`)).toMatchObject({
      checks: ['empty', 'empty'],
      countAt: NOW,
      updatedAt: EPOCH,
    });

    const oneOff = updateGoal(goals({ entries: [entry()] }), 'e1', { targetCount: 4 }, TODAY, NOW);
    const started = startRepeating(oneOff, 'e1', undefined, LATER);
    expect(started.templates[0]).toMatchObject({ targetCount: 4, countAt: NOW });
  });

  it("gives today's line its template's count when that was set after the line's own", () => {
    const stale = written();
    const heard = {
      ...stale,
      templates: [template({ targetCount: 2, countAt: NOW, updatedAt: NOW })],
    };

    const today = materializeToday(heard, TODAY);
    expect(byId(today, TODAY_LINE)).toMatchObject({ checks: ['empty', 'empty'], countAt: NOW });
    expect(materializeToday(today, TODAY)).toBe(today);
  });

  it('leaves a past page as it was written, whatever its template counts now', () => {
    const stale = written();
    const heard = {
      ...stale,
      templates: [template({ targetCount: 2, countAt: NOW, updatedAt: NOW })],
    };

    const tomorrow = materializeToday(heard, TOMORROW);
    expect(byId(tomorrow, TODAY_LINE)?.checks).toHaveLength(3);
  });

  it('keeps the marks and labels of the later write under the count set last', () => {
    const labeled = updateGoal(
      written(),
      TODAY_LINE,
      { checkLabels: ['Legs', 'Push', 'Pull'] },
      TODAY,
      '2026-08-21T08:00:00.000Z',
    );
    const lowered = updateGoal(labeled, TODAY_LINE, { targetCount: 2 }, TODAY, NOW);
    const tapped = cycleCheck(cycleCheck(labeled, TODAY_LINE, 0, LATER), TODAY_LINE, 2, LATER);

    const merged = mergeGoals(lowered, tapped);
    expect(byId(merged, TODAY_LINE)).toMatchObject({
      checks: ['done', 'empty'],
      checkLabels: ['Legs', 'Push'],
      countAt: NOW,
      updatedAt: LATER,
    });
    expect(mergeGoals(tapped, lowered)).toEqual(merged);
    expect(mergeGoals(merged, tapped)).toEqual(merged);
  });

  it("leaves the later write's own count where neither copy set one since", () => {
    const [phone, ipad] = [written(), written()];
    const merged = mergeGoals(cycleCheck(phone, TODAY_LINE, 0, NOW), ipad);
    expect(byId(merged, TODAY_LINE)?.checks).toEqual(['done', 'empty', 'empty']);
    expect(byId(merged, TODAY_LINE)?.countAt).toBeUndefined();
  });
});

describe('stampCounts', () => {
  it("credits each written row's count to that write, and leaves untouched and stamped rows alone", () => {
    const start = goals({
      templates: [
        template({ id: 'written', updatedAt: NOW }),
        template({ id: 'untouched' }),
        template({ id: 'stamped', countAt: NOW, updatedAt: LATER }),
      ],
      entries: [entry({ id: 'written', updatedAt: LATER }), entry({ id: 'untouched' })],
    });

    const stamped = stampCounts(start);
    expect(stamped.templates.map((t) => t.countAt)).toEqual([NOW, undefined, NOW]);
    expect(stamped.entries.map((e) => e.countAt)).toEqual([LATER, undefined]);
    expect(stamped.templates[1]).toBe(start.templates[1]);
    expect(stampCounts(stamped)).toEqual(stamped);
  });

  it('lets a count set before the upgrade stand against a later write that never touched it', () => {
    const LAST_NIGHT = '2026-08-20T20:00:00.000Z';
    const line = (count: number, updatedAt: string) =>
      entry({
        id: 't1:2026-08-20',
        templateId: 't1',
        periodKey: '2026-08-20',
        checks: Array.from({ length: count }, () => 'empty' as const),
        updatedAt,
      });
    const lowered = stampCounts(
      goals({
        templates: [template({ targetCount: 2, updatedAt: LAST_NIGHT })],
        entries: [line(2, LAST_NIGHT)],
      }),
    );
    const stale = stampCounts(
      goals({
        templates: [template({ targetCount: 3, updatedAt: '2026-08-19T09:00:00.000Z' })],
        entries: [line(3, '2026-08-19T09:00:00.000Z')],
      }),
    );

    const renamed = updateGoal(stale, 't1:2026-08-20', { title: 'Deep Work' }, TODAY, NOW);
    const merged = mergeGoals(lowered, renamed);
    expect(merged.templates[0]).toMatchObject({ title: 'Deep Work', targetCount: 2 });
    expect(byId(merged, 't1:2026-08-20')).toMatchObject({ title: 'Deep Work' });
    expect(byId(merged, 't1:2026-08-20')?.checks).toHaveLength(2);
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
        sortOrder: 1,
      },
      {
        id: 'x2',
        templateId: 'r4',
        cadence: 'daily',
        periodKey: TODAY,
        title: 'Read',
        checks: ['empty'],
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

  it('retires the star it drew, keeping the starred line first by its sortOrder', () => {
    const upgraded = upgradeLegacyGoals(legacy);
    expect(upgraded.entries.map((e) => [e.id, e.sortOrder])).toEqual([
      ['seed:daily:1:2026-08-21', 2],
      ['r4:2026-08-21', 3],
      ['x3', 1],
    ]);
    expect(upgraded.entries.some((e) => 'starred' in e)).toBe(false);
  });

  it('gives seed templates and materialized lines the ids every device shares', () => {
    const upgraded = upgradeLegacyGoals(legacy);
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

  it('stamps everything legacy and marks retirements at the epoch', () => {
    const upgraded = upgradeLegacyGoals(legacy);
    expect(upgraded.templates.every((t) => t.updatedAt === LEGACY)).toBe(true);
    expect(upgraded.entries.every((e) => e.updatedAt === LEGACY)).toBe(true);
    expect(upgraded.templates.map((t) => [t.retiredAt, t.retiredOn])).toEqual([
      [undefined, undefined],
      [EPOCH, '1970-01-01'],
      [undefined, undefined],
      [undefined, undefined],
    ]);
    expect(JSON.stringify(upgraded)).not.toContain('active');
    expect(upgraded.tombstones).toEqual({});
  });

  it('keeps the upgraded pad ahead of a fresh seed, so a new device adopts it', () => {
    const upgraded = upgradeLegacyGoals(legacy);
    const fresh = materializeToday(seedGoals(), TODAY);
    const merged = mergeGoals(fresh, upgraded);
    expect(merged.templates.find((t) => t.id === 'seed:daily:2')).toMatchObject({
      title: 'Deep Work',
      retiredAt: EPOCH,
    });
    expect(titlesOn(merged, TODAY)).toEqual(['One-off', 'Recurring Dailies', 'Read']);
  });

  it('loses every shared line to a write another device made before the upgrade', () => {
    const upgraded = upgradeLegacyGoals(legacy);
    const phone = goals({
      templates: [
        { ...upgraded.templates[0], title: 'Recurring Dailies, renamed', updatedAt: NOW },
      ],
      entries: [{ ...upgraded.entries[0], checks: ['missed'], updatedAt: NOW }],
      tombstones: { 'r4:2026-08-21': NOW },
    });
    const merged = mergeGoals(upgraded, phone);
    expect(merged.templates).toHaveLength(4);
    expect(merged.templates.find((t) => t.id === 'seed:daily:1')).toMatchObject({
      title: 'Recurring Dailies, renamed',
    });
    expect(byId(merged, 'seed:daily:1:2026-08-21')?.checks).toEqual(['missed']);
    expect(byId(merged, 'r4:2026-08-21')).toBeUndefined();
    expect(mergeGoals(phone, upgraded)).toEqual(merged);
  });
});

describe('retireStars', () => {
  it('renumbers each period in its starred-first order and drops the star', () => {
    const starred: StarredGoals = goals({
      entries: [
        starredEntry({ id: 'a', sortOrder: 1 }),
        starredEntry({ id: 'b', sortOrder: 2, starred: true }),
        starredEntry({ id: 'c', sortOrder: 3, starred: false }),
        starredEntry({ id: 'd', periodKey: '2026-08-22', sortOrder: 5 }),
        starredEntry({ id: 'e', periodKey: '2026-08-22', sortOrder: 4, starred: true }),
      ],
    });
    const state = retireStars(starred);
    expect(entriesForPeriod(state.entries, TODAY).map((e) => e.id)).toEqual(['b', 'a', 'c']);
    expect(entriesForPeriod(state.entries, '2026-08-22').map((e) => e.id)).toEqual(['e', 'd']);
    expect(state.entries.map((e) => e.sortOrder)).toEqual([2, 1, 3, 2, 1]);
    expect(state.entries.some((e) => 'starred' in e)).toBe(false);
  });

  it('leaves stamps, templates and tombstones as they were', () => {
    const start: StarredGoals = goals({
      templates: [template()],
      entries: [starredEntry({ starred: true, updatedAt: NOW })],
      tombstones: { gone: NOW },
    });
    const state = retireStars(start);
    expect(state.templates).toBe(start.templates);
    expect(state.tombstones).toBe(start.tombstones);
    expect(state.entries[0]).toEqual({ ...entry(), updatedAt: NOW });
  });
});
