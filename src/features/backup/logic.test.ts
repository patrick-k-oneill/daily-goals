import { describePad, padFileName, parsePad, SCHEMA_VERSION, serializePad } from './logic';
import type { PadData } from './types';

const NOW = '2026-08-27T07:30:00.000Z';

function samplePad(): PadData {
  return {
    goals: {
      templates: [
        {
          id: 't1',
          cadence: 'daily',
          title: 'Daily Prod',
          targetCount: 8,
          active: true,
          sortOrder: 2,
        },
        {
          id: 't2',
          cadence: 'weekly',
          title: 'Fitness',
          targetCount: 7,
          checkLabels: ['Legs', 'Push', 'Pull', 'Legs', 'Push', 'Pull', 'Core'],
          active: false,
          sortOrder: 2,
        },
      ],
      entries: [
        {
          id: 'e1',
          templateId: 't1',
          cadence: 'daily',
          periodKey: '2026-08-26',
          title: 'Daily Prod',
          checks: ['done', 'done', 'missed', 'empty', 'empty', 'empty', 'empty', 'empty'],
          starred: true,
          sortOrder: 2,
        },
        {
          id: 'e2',
          cadence: 'annual',
          periodKey: '2026',
          title: 'Ship the pad',
          checks: ['empty'],
          starred: false,
          sortOrder: 1,
        },
      ],
    },
    gratitude: {
      '2026-08-25': {
        forDate: '2026-08-25',
        writtenAt: '2026-08-26T07:00:00.000Z',
        text: 'Amy, Leto',
      },
      '2026-08-26': { forDate: '2026-08-26', writtenAt: NOW, text: 'A quiet morning' },
    },
    events: [
      { id: 'ev1', date: '2026-08-30', title: 'IRC', timeLabel: '4pm–5:30pm', note: 'omg lol' },
      { id: 'ev2', date: '2026-09-01', title: 'Cutover' },
    ],
  };
}

/** The sample pad's file with parts of the envelope swapped out. */
function fileWith(overrides: Record<string, unknown>): string {
  return JSON.stringify({ ...JSON.parse(serializePad(samplePad(), NOW)), ...overrides });
}

function reasonOf(text: string): string {
  const parsed = parsePad(text);
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
    expect(serializePad(samplePad(), NOW)).toContain('\n  "schemaVersion": 1,\n');
  });
});

describe('parsePad', () => {
  it('round-trips every template, entry, check, star, gratitude entry and event', () => {
    const pad = samplePad();
    expect(parsePad(serializePad(pad, NOW))).toEqual({ ok: true, exportedAt: NOW, pad });
  });

  it('refuses text that is not a pad file', () => {
    expect(reasonOf('not json')).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf('[1, 2]')).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf('{"goals": {}}')).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf(fileWith({ schemaVersion: '1' }))).toMatch(/isn’t a Daily Goals pad file/);
    expect(reasonOf(fileWith({ schemaVersion: 0 }))).toMatch(/isn’t a Daily Goals pad file/);
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

    expect(reasonOf(fileWith({ goals: { templates: [] } }))).toMatch(/damaged: its goals/);
    expect(reasonOf(fileWith({ goals: [] }))).toMatch(/damaged: its goals/);
  });

  it('refuses gratitude entries in the wrong shape or filed under the wrong date', () => {
    const misfiled = { '2026-08-20': samplePad().gratitude['2026-08-25'] };
    expect(reasonOf(fileWith({ gratitude: misfiled }))).toMatch(/damaged: its gratitude entries/);

    const untimed = { '2026-08-25': { forDate: '2026-08-25', text: 'grateful' } };
    expect(reasonOf(fileWith({ gratitude: untimed }))).toMatch(/damaged: its gratitude entries/);

    expect(reasonOf(fileWith({ gratitude: [] }))).toMatch(/damaged: its gratitude entries/);
  });

  it('refuses events in the wrong shape', () => {
    expect(reasonOf(fileWith({ events: [{ id: 'ev1', date: '2026-08-30' }] }))).toMatch(
      /damaged: its upcoming events/,
    );
    expect(
      reasonOf(fileWith({ events: [{ id: 'ev1', date: '2026-08-30', title: 'IRC', note: 3 }] })),
    ).toMatch(/damaged: its upcoming events/);
    expect(reasonOf(fileWith({ events: {} }))).toMatch(/damaged: its upcoming events/);
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
    expect(describePad({ goals: { templates: [], entries: [] }, gratitude: {}, events: [] })).toBe(
      '0 templates, 0 entries, 0 gratitude entries and 0 upcoming events',
    );
    const one = samplePad();
    expect(
      describePad({
        goals: {
          templates: one.goals.templates.slice(0, 1),
          entries: one.goals.entries.slice(0, 1),
        },
        gratitude: { '2026-08-25': one.gratitude['2026-08-25'] },
        events: one.events.slice(0, 1),
      }),
    ).toBe('1 template, 1 entry, 1 gratitude entry and 1 upcoming event');
  });
});
