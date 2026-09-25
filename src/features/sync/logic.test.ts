import type { PadData } from '@/features/backup/types';
import { mergeEvents } from '@/features/events/logic';
import {
  addGoal,
  cycleCheck,
  materializeToday,
  mergeGoals,
  seedGoals,
} from '@/features/goals/logic';
import type { GoalEntry } from '@/features/goals/types';
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

function line(id: string, periodKey: string, updatedAt = EPOCH): GoalEntry {
  return {
    id,
    templateId: 't1',
    cadence: 'daily',
    periodKey,
    title: 'Deep Work',
    checks: ['empty'],
    starred: false,
    sortOrder: 1,
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
          sortOrder: 1,
          updatedAt: NOW,
        },
      ],
      entries: [line('t1:2026-01-02', '2026-01-02', NOW), line('t1:2025-12-31', '2025-12-31', NOW)],
      tombstones: { 't1:2026-01-01': NOW },
    },
    gratitude: {
      entries: {
        '2026-01-01': { forDate: '2026-01-01', writtenAt: NOW, text: 'The new year' },
        '2025-12-31': { forDate: '2025-12-31', writtenAt: NOW, text: 'Last night' },
      },
      tombstones: { '2025-12-30': NOW },
    },
    events: {
      events: [{ id: 'ev1', date: '2026-08-30', title: 'IRC', timeLabel: '4pm', updatedAt: NOW }],
      tombstones: { ev0: NOW },
    },
  };
}

function emptyPad(): PadData {
  return {
    goals: { templates: [], entries: [], tombstones: {} },
    gratitude: { entries: {}, tombstones: {} },
    events: { events: [], tombstones: {} },
  };
}

function bodyOf(files: CloudFiles, path: string): Record<string, unknown> {
  return JSON.parse(files[path]);
}

describe('splitPad', () => {
  it('files each part where the layout puts it, under the schema version', () => {
    const files = splitPad(samplePad());
    expect(Object.keys(files).sort()).toEqual([
      'events.json',
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
    expect(bodyOf(files, 'events.json')).toEqual({
      schemaVersion: CLOUD_SCHEMA_VERSION,
      events: [expect.objectContaining({ id: 'ev1' })],
      tombstones: { ev0: NOW },
    });
  });

  it('writes the same bytes for the same pad whatever order it was written in', () => {
    const pad = samplePad();
    const reordered: PadData = {
      ...pad,
      goals: { ...pad.goals, entries: [...pad.goals.entries].reverse() },
      events: { tombstones: pad.events.tombstones, events: pad.events.events },
    };
    expect(splitPad(reordered)).toEqual(splitPad(pad));
  });
});

describe('joinPad', () => {
  it('reads back every part of a split pad, items sorted by key', () => {
    const pad = samplePad();
    const { pad: joined, unreadable } = joinPad(splitPad(pad));
    expect(unreadable).toEqual([]);
    expect(joined.goals.templates.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(joined.goals.entries.map((e) => e.id)).toEqual(['t1:2025-12-31', 't1:2026-01-02']);
    expect(joined.goals.tombstones).toEqual(pad.goals.tombstones);
    expect(Object.keys(joined.gratitude.entries)).toEqual(['2025-12-31', '2026-01-01']);
    expect(joined.gratitude.tombstones).toEqual(pad.gratitude.tombstones);
    expect(joined.events).toEqual(pad.events);
  });

  it('reads an empty cloud as an empty pad', () => {
    expect(joinPad({})).toEqual({ pad: emptyPad(), unreadable: [] });
  });

  it('skips a damaged file and one from a newer app, naming them, and reads the rest', () => {
    const files = splitPad(samplePad());
    files['goals/entries-2025.json'] = '{not json';
    files['gratitude/index.json'] = JSON.stringify({ schemaVersion: 1, tombstones: { x: 'soon' } });
    files['events.json'] = JSON.stringify({
      schemaVersion: CLOUD_SCHEMA_VERSION + 1,
      events: [],
      tombstones: {},
    });
    files['notes.json'] = 'something a later app wrote';

    const { pad, unreadable } = joinPad(files);
    expect(unreadable.sort()).toEqual([
      'events.json',
      'goals/entries-2025.json',
      'gratitude/index.json',
    ]);
    expect(pad.goals.entries.map((e) => e.id)).toEqual(['t1:2026-01-02']);
    expect(pad.gratitude.tombstones).toEqual({});
    expect(pad.events).toEqual({ events: [], tombstones: {} });
    expect(Object.keys(pad.gratitude.entries)).toEqual(['2025-12-31', '2026-01-01']);
  });
});

describe('separateCopies', () => {
  it('sets the conflict copies iCloud kept apart from the current files', () => {
    const { current, copies } = separateCopies({
      'events.json': 'a',
      'events.json@1': 'b',
      'events.json@2': 'c',
      'goals/index.json': 'd',
    });
    expect(current).toEqual({ 'events.json': 'a', 'goals/index.json': 'd' });
    expect(copies).toEqual([{ 'events.json': 'b' }, { 'events.json': 'c' }]);
  });
});

describe('changedPaths', () => {
  it('names only the files whose text the cloud lacks, and never an unreadable one', () => {
    const cloud = splitPad(samplePad());
    const next = { ...cloud, 'events.json': 'changed', 'goals/entries-2026.json': 'changed' };
    expect(changedPaths(cloud, next, ['events.json'])).toEqual(['goals/entries-2026.json']);
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
      events: mergeEvents(local.events, remote.events),
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
