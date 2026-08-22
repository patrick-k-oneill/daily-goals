import { currentStreak, sortedEntries } from './logic';
import type { GratitudeEntry } from './types';

function entry(forDate: string, text = 'grateful'): GratitudeEntry {
  return { forDate, writtenAt: `${forDate}T08:00:00.000Z`, text };
}

function byDate(...dates: string[]): Record<string, GratitudeEntry> {
  return Object.fromEntries(dates.map((d) => [d, entry(d)]));
}

describe('currentStreak', () => {
  it('is zero with no entries', () => {
    expect(currentStreak({}, '2026-08-21')).toBe(0);
  });

  it('counts consecutive days ending at the reflection date', () => {
    const entries = byDate('2026-08-19', '2026-08-20', '2026-08-21');
    expect(currentStreak(entries, '2026-08-21')).toBe(3);
  });

  it("doesn't break when this morning isn't written yet", () => {
    const entries = byDate('2026-08-19', '2026-08-20');
    expect(currentStreak(entries, '2026-08-21')).toBe(2);
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
