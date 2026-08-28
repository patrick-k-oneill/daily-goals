import type { UpcomingEvent } from '@/features/events/types';
import type { Cadence, CheckState, GoalEntry, GoalTemplate } from '@/features/goals/types';
import type { GratitudeEntries } from '@/features/gratitude/logic';
import { addDays, weekKeyOf, yearKeyOf, type DayKey } from '@/lib/dates';

import { formatBytes, storageFootprint } from './footprint';
import type { PadData } from './types';

/** Platform ceilings the pad must stay under (see ADR 0004). */
const ANDROID_ASYNC_STORAGE_DEFAULT_BYTES = 6 * 1024 * 1024;
const WEB_LOCAL_STORAGE_BYTES = 5 * 1024 * 1024;

/**
 * Projected footprint of a pad written every day for 1, 3 and 5 years. These
 * figures are the ones recorded in ADR 0004; a change to a persisted shape
 * moves them, and that is the moment to revisit the decision.
 */
const RECORDED_FIGURES = [
  { years: 1, goals: 746_516, gratitude: 177_768, events: 9_619, total: 933_903 },
  { years: 3, goals: 2_234_235, gratitude: 533_278, events: 28_887, total: 2_796_400 },
  { years: 5, goals: 3_721_916, gratitude: 888_788, events: 48_128, total: 4_658_832 },
];

describe('storageFootprint', () => {
  it('measures each store as the UTF-8 JSON zustand persists, and sums them', () => {
    const pad = syntheticPad(0);
    const footprint = storageFootprint(pad);
    expect(footprint.goals).toBe(utf8Bytes(JSON.stringify(pad.goals)));
    expect(footprint.gratitude).toBe(utf8Bytes(JSON.stringify({ entries: pad.gratitude })));
    expect(footprint.events).toBe(utf8Bytes(JSON.stringify({ events: pad.events })));
    expect(footprint.total).toBe(footprint.goals + footprint.gratitude + footprint.events);
  });

  it('counts bytes, not characters', () => {
    const ascii = storageFootprint(padWithGratitude('aaaa'));
    const accented = storageFootprint(padWithGratitude('éééé'));
    expect(accented.gratitude - ascii.gratitude).toBe(4);
  });

  it('projects a pad kept for 1, 3 and 5 years to the figures recorded in ADR 0004', () => {
    const figures = RECORDED_FIGURES.map(({ years }) => ({
      years,
      ...storageFootprint(syntheticPad(years)),
    }));
    expect(figures).toEqual(RECORDED_FIGURES);
  });

  it('grows linearly with the years written', () => {
    const one = storageFootprint(syntheticPad(1)).total;
    const five = storageFootprint(syntheticPad(5)).total;
    expect(five / one).toBeGreaterThan(4.9);
    expect(five / one).toBeLessThanOrEqual(5);
  });

  it('stays under the tightest platform ceiling for five years of pages', () => {
    const fiveYears = storageFootprint(syntheticPad(5));
    expect(fiveYears.total).toBeLessThan(WEB_LOCAL_STORAGE_BYTES);
    expect(fiveYears.total).toBeLessThan(ANDROID_ASYNC_STORAGE_DEFAULT_BYTES);
  });
});

describe('formatBytes', () => {
  it('uses decimal units like iOS Settings', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1_000)).toBe('1 KB');
    expect(formatBytes(12_400)).toBe('12 KB');
    expect(formatBytes(412_600)).toBe('413 KB');
    expect(formatBytes(1_500_000)).toBe('1.5 MB');
    expect(formatBytes(5_000_000)).toBe('5.0 MB');
  });
});

// --- A synthetic pad: the issue's model of a year, written every morning. ---

const FIRST_DAY: DayKey = '2026-01-05'; // a Monday, so weeks line up
const DAYS_PER_YEAR = 365;
const WEEKS_PER_YEAR = 52;
const EVENTS_PER_YEAR = 100;
const GRATITUDE_CHARS = 400;

const DAILY: [string, number][] = [
  ['Recurring Dailies', 1],
  ['Daily Prod', 8],
  ['Read 30 min', 1],
  ['Walk the dog', 1],
  ['Stretch', 1],
  ['Inbox zero', 1],
  ['Water', 4],
  ['No sugar', 1],
  ['Lights out by 11', 1],
  ['Call someone', 1],
];
const WEEKLY: [string, number, string[]?][] = [
  ['Recurring Dailies', 7],
  ['Fitness', 7, ['Legs', 'Push', 'Pull', 'Legs', 'Push', 'Pull', 'Core']],
  ['Weekly Prod', 6],
  ['Call Mom', 1],
  ['Meal prep', 1],
  ['Budget review', 1],
  ['Date night', 1],
  ['Deep clean one room', 1],
];
const ANNUAL: [string, number][] = [
  ['Ship the pad', 1],
  ['Run a half marathon', 1],
  ['Read 24 books', 24],
  ['Take a real vacation', 2],
  ['Max out the 401k', 1],
];

const GRATITUDE_LINE =
  'Grateful for a slow morning with Amy, Leto asleep on the porch, a long walk before the heat, ' +
  'a call with an old friend, and getting the hard thing done first. ';

/** A pad written every morning for `years` years (0 years = templates only). */
function syntheticPad(years: number): PadData {
  const templates = [
    ...DAILY.map(([title, n], i) => template('daily', title, n, i)),
    ...WEEKLY.map(([title, n, labels], i) => template('weekly', title, n, i, labels)),
    ...ANNUAL.map(([title, n], i) => template('annual', title, n, i)),
  ];
  const byCadence = (cadence: Cadence) => templates.filter((t) => t.cadence === cadence);

  const entries: GoalEntry[] = [];
  const gratitude: GratitudeEntries = {};
  const events: UpcomingEvent[] = [];

  for (let d = 0; d < DAYS_PER_YEAR * years; d++) {
    const day = addDays(FIRST_DAY, d);
    for (const t of byCadence('daily')) entries.push(entry(t, day, d));
    gratitude[day] = {
      forDate: day,
      writtenAt: `${addDays(day, 1)}T07:${String(d % 60).padStart(2, '0')}:00.000Z`,
      text: gratitudeText(d),
    };
  }
  for (let w = 0; w < WEEKS_PER_YEAR * years; w++) {
    const week = weekKeyOf(addDays(FIRST_DAY, w * 7));
    for (const t of byCadence('weekly')) entries.push(entry(t, week, w));
  }
  for (let y = 0; y < years; y++) {
    const year = yearKeyOf(addDays(FIRST_DAY, y * DAYS_PER_YEAR));
    for (const t of byCadence('annual')) entries.push(entry(t, year, y));
  }
  for (let e = 0; e < EVENTS_PER_YEAR * years; e++) {
    events.push({
      id: id(900_000 + e),
      date: addDays(FIRST_DAY, Math.floor(e * 3.65)),
      title: e % 2 ? 'IRC' : 'Dinner with the Harlows',
      timeLabel: e % 3 ? '4pm–5:30pm' : undefined,
      note: e % 4 ? undefined : 'bring the good wine',
    });
  }

  return { goals: { templates, entries }, gratitude, events };
}

let ids = 0;

/** Same length as `newId()`: 8 base36 time digits, a dash, 8 random digits. */
function id(n: number): string {
  return `${(1_780_000_000_000 + n).toString(36)}-${n.toString(36).padStart(8, '0')}`;
}

function template(
  cadence: Cadence,
  title: string,
  targetCount: number,
  sortOrder: number,
  checkLabels?: string[],
): GoalTemplate {
  return { id: id(ids++), cadence, title, targetCount, checkLabels, active: true, sortOrder };
}

const CHECK_CYCLE: CheckState[] = ['done', 'done', 'missed', 'empty'];

function entry(t: GoalTemplate, periodKey: string, n: number): GoalEntry {
  return {
    id: id(ids++),
    templateId: t.id,
    cadence: t.cadence,
    periodKey,
    title: t.title,
    checks: Array.from({ length: t.targetCount }, (_, i) => CHECK_CYCLE[(i + n) % 4]),
    checkLabels: t.checkLabels,
    starred: n % 3 === 0,
    sortOrder: t.sortOrder,
  };
}

function gratitudeText(day: number): string {
  return `Day ${day}. ${GRATITUDE_LINE.repeat(3)}`.slice(0, GRATITUDE_CHARS);
}

function padWithGratitude(text: string): PadData {
  return {
    goals: { templates: [], entries: [] },
    gratitude: { '2026-01-05': { forDate: '2026-01-05', writtenAt: '2026-01-06T07:00:00Z', text } },
    events: [],
  };
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}
