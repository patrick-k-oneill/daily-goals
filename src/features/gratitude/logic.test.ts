import { currentStreak, hasEntry, reflectionDateFor, saveEntry, sortedEntries } from './logic';
import type { GratitudeEntry } from './types';

const WRITTEN_AT = '2026-08-22T08:00:00.000Z';

function entry(forDate: string, text = 'grateful'): GratitudeEntry {
  return { forDate, writtenAt: `${forDate}T08:00:00.000Z`, text };
}

function byDate(...dates: string[]): Record<string, GratitudeEntry> {
  return Object.fromEntries(dates.map((d) => [d, entry(d)]));
}

describe('reflectionDateFor', () => {
  it('is the day before, across month boundaries', () => {
    expect(reflectionDateFor('2026-08-22')).toBe('2026-08-21');
    expect(reflectionDateFor('2026-09-01')).toBe('2026-08-31');
  });
});

describe('saveEntry', () => {
  it('writes the entry keyed by the day reflected on, stamping when it was written', () => {
    const entries = saveEntry({}, '2026-08-21', 'Amy, Leto', WRITTEN_AT);
    expect(entries['2026-08-21']).toEqual({
      forDate: '2026-08-21',
      writtenAt: WRITTEN_AT,
      text: 'Amy, Leto',
    });
    expect(hasEntry(entries, '2026-08-21')).toBe(true);
  });

  it('keeps only the latest of sequential saves for the same date', () => {
    let entries = saveEntry({}, '2026-08-21', 'first draft', WRITTEN_AT);
    entries = saveEntry(entries, '2026-08-21', 'second draft', WRITTEN_AT);
    expect(entries['2026-08-21'].text).toBe('second draft');
  });

  it('tears the page out when the text is emptied, and leaves other days alone', () => {
    let entries = byDate('2026-08-20', '2026-08-21');
    entries = saveEntry(entries, '2026-08-21', '   ', WRITTEN_AT);
    expect(entries['2026-08-21']).toBeUndefined();
    expect(hasEntry(entries, '2026-08-21')).toBe(false);
    expect(entries['2026-08-20'].text).toBe('grateful');

    expect(saveEntry(entries, '2026-08-21', '', WRITTEN_AT)).toBe(entries);
  });
});

describe('currentStreak', () => {
  it('is zero with no entries', () => {
    expect(currentStreak({}, '2026-08-21')).toBe(0);
  });

  it('counts consecutive days ending at the reflection date', () => {
    expect(currentStreak(byDate('2026-08-19', '2026-08-20', '2026-08-21'), '2026-08-21')).toBe(3);
  });

  it("doesn't break when this morning isn't written yet", () => {
    expect(currentStreak(byDate('2026-08-19', '2026-08-20'), '2026-08-21')).toBe(2);
  });

  it('breaks on a missed day', () => {
    const entries = byDate('2026-08-17', '2026-08-18', '2026-08-20', '2026-08-21');
    expect(currentStreak(entries, '2026-08-21')).toBe(2);
  });
});

describe('sortedEntries', () => {
  it('sorts newest first and drops blank entries', () => {
    const entries = {
      '2026-08-19': entry('2026-08-19'),
      '2026-08-21': entry('2026-08-21'),
      '2026-08-20': entry('2026-08-20', '   '),
    };
    expect(sortedEntries(entries).map((e) => e.forDate)).toEqual(['2026-08-21', '2026-08-19']);
  });
});
