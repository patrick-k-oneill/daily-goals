import type { PadData } from '@/features/backup/types';
import {
  addGoal,
  cycleCheck,
  declineSuggestion,
  entriesForPeriod,
  materializeToday,
  mergeGoals,
  seedGoals,
  stopRepeating,
  updateGoal,
} from '@/features/goals/logic';
import type { GoalEntry, StarredGoalEntry } from '@/features/goals/types';
import { mergeGratitude, saveEntry } from '@/features/gratitude/logic';
import { EPOCH } from '@/lib/merge';

import {
  changedPaths,
  CLOUD_SCHEMA_VERSION,
  describeSync,
  joinPad,
  separateCopies,
  splitPad,
} from './logic';
import type { CloudFiles } from './types';

const NOW = '2026-08-21T09:00:00.000Z';
const LATER = '2026-08-21T10:00:00.000Z';
const TODAY = '2026-08-21';

function line(id: string, periodKey: string, updatedAt = EPOCH, sortOrder = 1): GoalEntry {
  return {
    id,
    templateId: 't1',
    cadence: 'daily',
    periodKey,
    title: 'Deep Work',
    checks: ['empty'],
    sortOrder,
    updatedAt,
  };
}

/** Two years of pad, written out of key order so canonical sorting is visible. */
function samplePad(): PadData {
  return {
    goals: {
      templates: [
        {
          id: 't2',
          cadence: 'weekly',
          title: 'Fitness',
          targetCount: 3,
          sortOrder: 2,
          updatedAt: NOW,
        },
        {
          id: 't1',
          cadence: 'daily',
          title: 'Deep Work',
          targetCount: 1,
          weekdays: [1, 3, 5],
          sortOrder: 1,
          updatedAt: NOW,
        },
      ],
      entries: [
        line('t1:2026-01-02', '2026-01-02', NOW, 3),
        line('t1:2025-12-31', '2025-12-31', NOW),
      ],
      tombstones: { 't1:2026-01-01': NOW },
      declinedSuggestions: ['one-off-2', 'one-off-1'],
    },
    gratitude: {
      entries: {
        '2026-01-01': { forDate: '2026-01-01', writtenAt: NOW, text: 'The new year' },
        '2025-12-31': { forDate: '2025-12-31', writtenAt: NOW, text: 'Last night' },
      },
      tombstones: { '2025-12-30': NOW },
    },
  };
}

/** An events file as a layout that held upcoming events wrote it. */
function eventsFile(): string {
  return JSON.stringify({
    schemaVersion: 2,
    events: [{ id: 'ev1', date: '2026-08-30', title: 'Dentist', timeLabel: '4pm', updatedAt: NOW }],
    tombstones: { ev0: NOW },
  });
}

function emptyPad(): PadData {
  return {
    goals: { templates: [], entries: [], tombstones: {} },
    gratitude: { entries: {}, tombstones: {} },
  };
}

function bodyOf(files: CloudFiles, path: string): Record<string, unknown> {
  return JSON.parse(files[path]);
}

describe('splitPad', () => {
  it('files each part where the layout puts it, under the schema version', () => {
    const files = splitPad(samplePad());
    expect(Object.keys(files).sort()).toEqual([
      'goals/entries-2025.json',
      'goals/entries-2026.json',
      'goals/index.json',
      'gratitude/entries-2025.json',
      'gratitude/entries-2026.json',
      'gratitude/index.json',
    ]);
    expect(bodyOf(files, 'goals/index.json')).toEqual({
      schemaVersion: CLOUD_SCHEMA_VERSION,
      templates: [expect.objectContaining({ id: 't1' }), expect.objectContaining({ id: 't2' })],
      tombstones: { 't1:2026-01-01': NOW },
      declinedSuggestions: ['one-off-1', 'one-off-2'],
    });
    expect(bodyOf(files, 'goals/entries-2025.json')).toEqual({
      schemaVersion: CLOUD_SCHEMA_VERSION,
      entries: [expect.objectContaining({ id: 't1:2025-12-31' })],
    });
    expect(bodyOf(files, 'gratitude/entries-2026.json')).toEqual({
      schemaVersion: CLOUD_SCHEMA_VERSION,
      entries: { '2026-01-01': expect.objectContaining({ text: 'The new year' }) },
    });
    expect(bodyOf(files, 'gratitude/index.json')).toEqual({
      schemaVersion: CLOUD_SCHEMA_VERSION,
      tombstones: { '2025-12-30': NOW },
    });
  });

  it('leaves declined suggestions out of the goals index when there are none', () => {
    const index = bodyOf(splitPad(emptyPad()), 'goals/index.json');
    expect('declinedSuggestions' in index).toBe(false);
    const none = { ...emptyPad().goals, declinedSuggestions: [] };
    expect(splitPad({ ...emptyPad(), goals: none })).toEqual(splitPad(emptyPad()));
  });

  it('writes the same bytes for the same pad whatever order it was written in', () => {
    const pad = samplePad();
    const reordered: PadData = {
      ...pad,
      goals: {
        ...pad.goals,
        entries: [...pad.goals.entries].reverse(),
        declinedSuggestions: [...(pad.goals.declinedSuggestions ?? [])].reverse(),
      },
    };
    expect(splitPad(reordered)).toEqual(splitPad(pad));
  });
});

describe('joinPad', () => {
  it('reads back every part of a split pad, items sorted by key', () => {
    const pad = samplePad();
    const { pad: joined, unreadable } = joinPad(splitPad(pad));
    expect(unreadable).toEqual([]);
    expect(joined.goals.templates.map((t) => [t.id, t.weekdays])).toEqual([
      ['t1', [1, 3, 5]],
      ['t2', undefined],
    ]);
    expect(joined.goals.entries.map((e) => [e.id, e.sortOrder])).toEqual([
      ['t1:2025-12-31', 1],
      ['t1:2026-01-02', 3],
    ]);
    expect(joined.goals.tombstones).toEqual(pad.goals.tombstones);
    expect(Object.keys(joined.gratitude.entries)).toEqual(['2025-12-31', '2026-01-01']);
    expect(joined.gratitude.tombstones).toEqual(pad.gratitude.tombstones);
    expect(joined.goals.declinedSuggestions).toEqual(['one-off-1', 'one-off-2']);
  });

  it('joins a cloud pad that still holds an events file, reading past it and never writing it', () => {
    const files = splitPad(samplePad());
    const plain = joinPad(files);

    for (const events of [eventsFile(), '{not json', JSON.stringify({ schemaVersion: 99 })]) {
      const withEvents = { ...files, 'events.json': events };
      expect(joinPad(withEvents)).toEqual(plain);
      expect(changedPaths(withEvents, splitPad(plain.pad), plain.unreadable)).toEqual([]);
    }

    const { copies } = separateCopies({ ...files, 'events.json@1': eventsFile() });
    expect(copies.map((copy) => joinPad(copy))).toEqual([{ pad: emptyPad(), unreadable: [] }]);
  });

  it('reads a goals index written before it held declined suggestions', () => {
    const { templates, tombstones } = samplePad().goals;
    const { pad, unreadable } = joinPad({
      'goals/index.json': JSON.stringify({ schemaVersion: 2, templates, tombstones }),
    });
    expect(unreadable).toEqual([]);
    expect(pad.goals.templates).toHaveLength(2);
    expect('declinedSuggestions' in pad.goals).toBe(false);
  });

  it('reads an empty cloud as an empty pad', () => {
    expect(joinPad({})).toEqual({ pad: emptyPad(), unreadable: [] });
  });

  it('reads a pad the starred layout wrote, its starred line first by sortOrder and the star gone', () => {
    const starred = (id: string, sortOrder: number, isStarred: boolean): StarredGoalEntry => ({
      ...line(id, '2026-01-02', NOW, sortOrder),
      starred: isStarred,
    });
    const { templates, tombstones } = samplePad().goals;
    const unscheduled = templates.map(({ weekdays: _weekdays, ...t }) => t);
    const files: CloudFiles = {
      'goals/index.json': JSON.stringify({ schemaVersion: 1, templates: unscheduled, tombstones }),
      'goals/entries-2026.json': JSON.stringify({
        schemaVersion: 1,
        entries: [starred('a', 1, false), starred('b', 2, true), starred('c', 3, false)],
      }),
    };

    const { pad, unreadable } = joinPad(files);
    expect(unreadable).toEqual([]);
    expect(pad.goals.templates).toEqual(unscheduled);
    expect(pad.goals.entries.map((e) => [e.id, e.sortOrder])).toEqual([
      ['a', 2],
      ['b', 1],
      ['c', 3],
    ]);
    expect(pad.goals.entries.some((e) => 'starred' in e)).toBe(false);

    const merged = mergeGoals(emptyPad().goals, pad.goals);
    expect(entriesForPeriod(merged.entries, '2026-01-02').map((e) => e.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('skips a damaged file and one from a newer app, naming them, and reads the rest', () => {
    const files = splitPad(samplePad());
    files['goals/entries-2025.json'] = '{not json';
    files['gratitude/index.json'] = JSON.stringify({ schemaVersion: 1, tombstones: { x: 'soon' } });
    files['gratitude/entries-2025.json'] = JSON.stringify({
      schemaVersion: CLOUD_SCHEMA_VERSION + 1,
      entries: {},
    });
    files['notes.json'] = 'something a later app wrote';

    const { pad, unreadable } = joinPad(files);
    expect(unreadable.sort()).toEqual([
      'goals/entries-2025.json',
      'gratitude/entries-2025.json',
      'gratitude/index.json',
    ]);
    expect(pad.goals.entries.map((e) => e.id)).toEqual(['t1:2026-01-02']);
    expect(pad.gratitude.tombstones).toEqual({});
    expect(Object.keys(pad.gratitude.entries)).toEqual(['2026-01-01']);
  });
});

describe('separateCopies', () => {
  it('sets the conflict copies iCloud kept apart from the current files', () => {
    const { current, copies } = separateCopies({
      'gratitude/index.json': 'a',
      'gratitude/index.json@1': 'b',
      'gratitude/index.json@2': 'c',
      'goals/index.json': 'd',
    });
    expect(current).toEqual({ 'gratitude/index.json': 'a', 'goals/index.json': 'd' });
    expect(copies).toEqual([{ 'gratitude/index.json': 'b' }, { 'gratitude/index.json': 'c' }]);
  });
});

describe('changedPaths', () => {
  it('names only the files whose text the cloud lacks, and never an unreadable one', () => {
    const cloud = splitPad(samplePad());
    const next = {
      ...cloud,
      'gratitude/index.json': 'changed',
      'goals/entries-2026.json': 'changed',
    };
    expect(changedPaths(cloud, next, ['gratitude/index.json'])).toEqual([
      'goals/entries-2026.json',
    ]);
    expect(changedPaths(cloud, cloud, [])).toEqual([]);
  });

  it('names everything when the cloud is empty', () => {
    const next = splitPad(samplePad());
    expect(changedPaths({}, next, [])).toEqual(Object.keys(next).sort());
  });
});

describe('two devices through the cloud', () => {
  /** What the engine does with a device's pad: merge the cloud in, push what the cloud lacks. */
  function reconcile(local: PadData, cloud: CloudFiles): { pad: PadData; cloud: CloudFiles } {
    const { pad: remote, unreadable } = joinPad(cloud);
    const pad: PadData = {
      goals: materializeToday(mergeGoals(local.goals, remote.goals), TODAY),
      gratitude: mergeGratitude(local.gratitude, remote.gratitude),
    };
    const next = splitPad(pad);
    const written = { ...cloud };
    for (const path of changedPaths(cloud, next, unreadable)) written[path] = next[path];
    return { pad, cloud: written };
  }

  it('converge on one pad, after which neither has anything to push', () => {
    const fresh = (): PadData => ({ ...emptyPad(), goals: materializeToday(seedGoals(), TODAY) });
    const phone: PadData = {
      ...fresh(),
      goals: cycleCheck(fresh().goals, `seed:daily:1:${TODAY}`, 0, NOW),
    };
    const ipad: PadData = {
      ...fresh(),
      goals: addGoal(
        fresh().goals,
        { cadence: 'daily', periodKey: TODAY, title: 'Call Mom', targetCount: 1, repeats: false },
        LATER,
      ),
      gratitude: saveEntry({ entries: {}, tombstones: {} }, '2026-08-20', 'Amy', LATER),
    };

    const phoneFirst = reconcile(phone, {});
    const ipadNext = reconcile(ipad, phoneFirst.cloud);
    const phoneAgain = reconcile(phoneFirst.pad, ipadNext.cloud);

    expect(phoneAgain.pad).toEqual(ipadNext.pad);
    expect(phoneAgain.cloud).toEqual(ipadNext.cloud);
    const titles = phoneAgain.pad.goals.entries.map((e) => e.title).sort();
    expect(titles).toEqual([
      'Call Mom',
      'Daily Prod',
      'Fitness',
      'Recurring Dailies',
      'Recurring Dailies',
      'Weekly Prod',
    ]);
    expect(
      phoneAgain.pad.goals.entries.find((e) => e.id === `seed:daily:1:${TODAY}`)?.checks,
    ).toEqual(['done']);
    expect(phoneAgain.pad.gratitude.entries['2026-08-20']?.text).toBe('Amy');
    expect(changedPaths(phoneAgain.cloud, splitPad(ipadNext.pad), [])).toEqual([]);
  });

  it('carry a declined suggestion to the other device through the goals index', () => {
    const fresh = (): PadData => ({ ...emptyPad(), goals: materializeToday(seedGoals(), TODAY) });
    const phone: PadData = { ...fresh(), goals: declineSuggestion(fresh().goals, 'one-off-1') };

    const phoneFirst = reconcile(phone, {});
    const ipadNext = reconcile(fresh(), phoneFirst.cloud);
    const phoneAgain = reconcile(phoneFirst.pad, ipadNext.cloud);

    expect(ipadNext.pad.goals.declinedSuggestions).toEqual(['one-off-1']);
    expect(ipadNext.cloud).toEqual(phoneFirst.cloud);
    expect(phoneAgain.pad).toEqual(ipadNext.pad);
  });

  it('keep a goal stopped on one device stopped after a later edit on the other', () => {
    const fresh = (): PadData => ({ ...emptyPad(), goals: materializeToday(seedGoals(), TODAY) });
    const lineId = `seed:daily:1:${TODAY}`;
    const phone: PadData = { ...fresh(), goals: stopRepeating(fresh().goals, lineId, NOW) };
    const ipad: PadData = {
      ...fresh(),
      goals: updateGoal(fresh().goals, lineId, { title: 'Dailies' }, LATER),
    };

    const phoneFirst = reconcile(phone, {});
    const ipadNext = reconcile(ipad, phoneFirst.cloud);
    const phoneAgain = reconcile(phoneFirst.pad, ipadNext.cloud);
    const ipadAgain = reconcile(ipadNext.pad, phoneAgain.cloud);

    const template = phoneAgain.pad.goals.templates.find((t) => t.id === 'seed:daily:1');
    expect(template).toMatchObject({ title: 'Dailies', retiredAt: NOW, updatedAt: LATER });
    expect(phoneAgain.pad.goals.entries.find((e) => e.id === lineId)?.title).toBe('Dailies');
    expect(ipadAgain.pad).toEqual(phoneAgain.pad);
    expect(ipadAgain.cloud).toEqual(phoneAgain.cloud);
  });
});

describe('describeSync', () => {
  it('says where sync stands in the pad footer', () => {
    expect(describeSync('starting', null, null)).toBe('Checking iCloud…');
    expect(describeSync('syncing', null, null)).toBe('Syncing with iCloud…');
    expect(describeSync('synced', NOW, null)).toMatch(/^Synced with iCloud at \d/);
    expect(describeSync('unavailable', null, null)).toMatch(/^Not synced\./);
    expect(describeSync('error', null, 'the container is missing')).toBe(
      'Couldn’t sync with iCloud: the container is missing',
    );
  });
});
