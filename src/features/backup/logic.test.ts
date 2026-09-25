import { EPOCH } from '@/lib/merge';

import { describePad, padFileName, parsePad, SCHEMA_VERSION, serializePad } from './logic';
import type { LegacyPadData, PadData } from './types';

const NOW = '2026-08-27T07:30:00.000Z';
const STAMP = '2026-08-26T09:00:00.000Z';

function samplePad(): PadData {
  return {
    goals: {
      templates: [
        {
          id: 't1',
          cadence: 'daily',
          title: 'Daily Prod',
          targetCount: 8,
          sortOrder: 2,
          updatedAt: STAMP,
        },
        {
          id: 't2',
          cadence: 'weekly',
          title: 'Fitness',
          targetCount: 7,
          checkLabels: ['Legs', 'Push', 'Pull', 'Legs', 'Push', 'Pull', 'Core'],
          sortOrder: 2,
          retiredAt: STAMP,
          updatedAt: STAMP,
        },
      ],
      entries: [
        {
          id: 't1:2026-08-26',
          templateId: 't1',
          cadence: 'daily',
          periodKey: '2026-08-26',
          title: 'Daily Prod',
          checks: ['done', 'done', 'missed', 'empty', 'empty', 'empty', 'empty', 'empty'],
          starred: true,
          sortOrder: 2,
          updatedAt: STAMP,
        },
        {
          id: 'e2',
          cadence: 'annual',
          periodKey: '2026',
          title: 'Ship the pad',
          checks: ['empty'],
          starred: false,
          sortOrder: 1,
          updatedAt: EPOCH,
        },
      ],
      tombstones: { 't2:2026-W34': STAMP },
    },
    gratitude: {
      entries: {
        '2026-08-25': {
          forDate: '2026-08-25',
          writtenAt: '2026-08-26T07:00:00.000Z',
          text: 'Amy, Leto',
        },
        '2026-08-26': { forDate: '2026-08-26', writtenAt: NOW, text: 'A quiet morning' },
      },
      tombstones: { '2026-08-24': STAMP },
    },
    events: {
      events: [
        {
          id: 'ev1',
          date: '2026-08-30',
          title: 'IRC',
          timeLabel: '4pm–5:30pm',
          note: 'omg lol',
          updatedAt: STAMP,
        },
        { id: 'ev2', date: '2026-09-01', title: 'Cutover', updatedAt: STAMP },
      ],
      tombstones: {},
    },
  };
}

/** The pad as a schema 1 file carried it: no stamps, `active` flags, no tombstones. */
function legacyPad(): LegacyPadData {
  return {
    goals: {
      templates: [
        {
          id: 'r1',
          cadence: 'daily',
          title: 'Daily Prod',
          targetCount: 8,
          active: true,
          sortOrder: 2,
        },
        {
          id: 'r2',
          cadence: 'weekly',
          title: 'Fitness',
          targetCount: 7,
          active: false,
          sortOrder: 2,
        },
      ],
      entries: [
        {
          id: 'x1',
          templateId: 'r1',
          cadence: 'daily',
          periodKey: '2026-08-26',
          title: 'Daily Prod',
          checks: ['done'],
          starred: true,
          sortOrder: 2,
        },
      ],
    },
    gratitude: {
      '2026-08-25': { forDate: '2026-08-25', writtenAt: '2026-08-26T07:00:00.000Z', text: 'Amy' },
    },
    events: [{ id: 'ev1', date: '2026-08-30', title: 'IRC', timeLabel: '4pm–5:30pm' }],
  };
}

/** The sample pad's file with parts of the envelope swapped out. */
function fileWith(overrides: Record<string, unknown>): string {
  return JSON.stringify({ ...JSON.parse(serializePad(samplePad(), NOW)), ...overrides });
}

function legacyFileWith(overrides: Record<string, unknown>): string {
  return JSON.stringify({ schemaVersion: 1, exportedAt: NOW, ...legacyPad(), ...overrides });
}

function reasonOf(text: string): string {
  const parsed = parsePad(text, NOW);
  if (parsed.ok) throw new Error('expected the file to be refused');
  return parsed.reason;
}

describe('serializePad', () => {
  it('writes the versioned envelope, stamped with the export time', () => {
    const file = JSON.parse(serializePad(samplePad(), NOW));
    expect(Object.keys(file)).toEqual([
      'schemaVersion',
      'exportedAt',
      'goals',
      'gratitude',
      'events',
    ]);
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
    expect(file.exportedAt).toBe(NOW);
  });

  it('is readable as a text file', () => {
    expect(serializePad(samplePad(), NOW)).toContain('\n  "schemaVersion": 2,\n');
  });
});

describe('parsePad', () => {
  it('round-trips every template, entry, check, star, tombstone, gratitude entry and event', () => {
    const pad = samplePad();
    expect(parsePad(serializePad(pad, NOW), NOW)).toEqual({ ok: true, exportedAt: NOW, pad });
  });

  it('reads a schema 1 file, stamping its items with the import and sharing its ids', () => {
    const parsed = parsePad(legacyFileWith({}), NOW);
    if (!parsed.ok) throw new Error(parsed.reason);
    expect(parsed.exportedAt).toBe(NOW);
    expect(parsed.pad.goals.templates.map((t) => [t.id, t.updatedAt, t.retiredAt])).toEqual([
      ['seed:daily:2', NOW, undefined],
      ['seed:weekly:2', NOW, EPOCH],
    ]);
    expect(parsed.pad.goals.entries[0]).toMatchObject({
      id: 'seed:daily:2:2026-08-26',
      templateId: 'seed:daily:2',
      updatedAt: NOW,
    });
    expect(parsed.pad.goals.tombstones).toEqual({});
    expect(parsed.pad.gratitude).toEqual({ entries: legacyPad().gratitude, tombstones: {} });
    expect(parsed.pad.events.events[0]).toMatchObject({ id: 'ev1', updatedAt: NOW });
    expect(parsed.pad.events.tombstones).toEqual({});
  });

  it('refuses text that is not a pad file', () => {
    expect(reasonOf('not json')).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf('[1, 2]')).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf('{"goals": {}}')).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf(fileWith({ schemaVersion: '2' }))).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf(fileWith({ schemaVersion: 0 }))).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf(fileWith({ schemaVersion: 1.5 }))).toMatch(/isn’t a Daily Goals pad file/);
  });

  it('refuses a file from a newer schema version', () => {
    expect(reasonOf(fileWith({ schemaVersion: SCHEMA_VERSION + 1 }))).toMatch(/newer version/);
  });

  it('refuses a damaged export date', () => {
    expect(reasonOf(fileWith({ exportedAt: 'yesterday' }))).toMatch(/export date/);
    expect(reasonOf(fileWith({ exportedAt: undefined }))).toMatch(/export date/);
  });

  it('refuses goals in the wrong shape, naming the part', () => {
    const pad = samplePad();
    const badCheck = { ...pad.goals, entries: [{ ...pad.goals.entries[0], checks: ['ticked'] }] };
    expect(reasonOf(fileWith({ goals: badCheck }))).toMatch(/damaged: its goals/);

    const badCadence = {
      ...pad.goals,
      templates: [{ ...pad.goals.templates[0], cadence: 'monthly' }],
    };
    expect(reasonOf(fileWith({ goals: badCadence }))).toMatch(/damaged: its goals/);

    const unstamped = {
      ...pad.goals,
      entries: [{ ...pad.goals.entries[0], updatedAt: undefined }],
    };
    expect(reasonOf(fileWith({ goals: unstamped }))).toMatch(/damaged: its goals/);

    const badTombstone = { ...pad.goals, tombstones: { x: 'yesterday' } };
    expect(reasonOf(fileWith({ goals: badTombstone }))).toMatch(/damaged: its goals/);

    expect(reasonOf(fileWith({ goals: { templates: [], entries: [] } }))).toMatch(
      /damaged: its goals/,
    );
    expect(reasonOf(fileWith({ goals: [] }))).toMatch(/damaged: its goals/);
  });

  it('refuses a schema 1 file whose goals are in the wrong shape', () => {
    const goals = legacyPad().goals;
    const stamped = { ...goals, templates: [{ ...goals.templates[0], active: undefined }] };
    expect(reasonOf(legacyFileWith({ goals: stamped }))).toMatch(/damaged: its goals/);
  });

  it('refuses gratitude entries in the wrong shape or filed under the wrong date', () => {
    const misfiled = {
      entries: { '2026-08-20': samplePad().gratitude.entries['2026-08-25'] },
      tombstones: {},
    };
    expect(reasonOf(fileWith({ gratitude: misfiled }))).toMatch(/damaged: its gratitude entries/);

    const untimed = {
      entries: { '2026-08-25': { forDate: '2026-08-25', text: 'grateful' } },
      tombstones: {},
    };
    expect(reasonOf(fileWith({ gratitude: untimed }))).toMatch(/damaged: its gratitude entries/);

    expect(reasonOf(fileWith({ gratitude: { entries: {} } }))).toMatch(
      /damaged: its gratitude entries/,
    );
    expect(reasonOf(fileWith({ gratitude: [] }))).toMatch(/damaged: its gratitude entries/);
  });

  it('refuses events in the wrong shape', () => {
    const events = (list: unknown) => fileWith({ events: { events: list, tombstones: {} } });
    expect(reasonOf(events([{ id: 'ev1', date: '2026-08-30' }]))).toMatch(
      /damaged: its upcoming events/,
    );
    expect(
      reasonOf(events([{ id: 'ev1', date: '2026-08-30', title: 'IRC', note: 3, updatedAt: NOW }])),
    ).toMatch(/damaged: its upcoming events/);
    expect(reasonOf(events([{ id: 'ev1', date: '2026-08-30', title: 'IRC' }]))).toMatch(
      /damaged: its upcoming events/,
    );
    expect(reasonOf(fileWith({ events: [] }))).toMatch(/damaged: its upcoming events/);
  });
});

describe('padFileName', () => {
  it('names the file after the day it was exported', () => {
    expect(padFileName('2026-08-27')).toBe('daily-goals-2026-08-27.json');
  });
});

describe('describePad', () => {
  it('counts what an import would bring, pluralized', () => {
    expect(describePad(samplePad())).toBe(
      '2 templates, 2 entries, 2 gratitude entries and 2 upcoming events',
    );
    expect(
      describePad({
        goals: { templates: [], entries: [], tombstones: {} },
        gratitude: { entries: {}, tombstones: {} },
        events: { events: [], tombstones: {} },
      }),
    ).toBe('0 templates, 0 entries, 0 gratitude entries and 0 upcoming events');
    const one = samplePad();
    expect(
      describePad({
        goals: {
          templates: one.goals.templates.slice(0, 1),
          entries: one.goals.entries.slice(0, 1),
          tombstones: {},
        },
        gratitude: {
          entries: { '2026-08-25': one.gratitude.entries['2026-08-25'] },
          tombstones: {},
        },
        events: { events: one.events.events.slice(0, 1), tombstones: {} },
      }),
    ).toBe('1 template, 1 entry, 1 gratitude entry and 1 upcoming event');
  });
});
