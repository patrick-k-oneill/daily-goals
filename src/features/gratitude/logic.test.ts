import {
  currentStreak,
  hasEntry,
  mergeGratitude,
  reflectionDateFor,
  saveEntry,
  sortedEntries,
} from './logic';
import type { Gratitude, GratitudeEntry } from './types';

const WRITTEN_AT = '2026-08-22T08:00:00.000Z';
const LATER = '2026-08-22T09:00:00.000Z';

function entry(forDate: string, text = 'grateful'): GratitudeEntry {
  return { forDate, writtenAt: `${forDate}T08:00:00.000Z`, text };
}

function byDate(...dates: string[]): Record<string, GratitudeEntry> {
  return Object.fromEntries(dates.map((d) => [d, entry(d)]));
}

function journal(...dates: string[]): Gratitude {
  return { entries: byDate(...dates), tombstones: {} };
}

describe('reflectionDateFor', () => {
  it('is the day before, across month boundaries', () => {
    expect(reflectionDateFor('2026-08-22')).toBe('2026-08-21');
    expect(reflectionDateFor('2026-09-01')).toBe('2026-08-31');
  });
});

describe('saveEntry', () => {
  it('writes the entry keyed by the day reflected on, stamping when it was written', () => {
    const { entries } = saveEntry(journal(), '2026-08-21', 'Amy, Leto', WRITTEN_AT);
    expect(entries['2026-08-21']).toEqual({
      forDate: '2026-08-21',
      writtenAt: WRITTEN_AT,
      text: 'Amy, Leto',
    });
    expect(hasEntry(entries, '2026-08-21')).toBe(true);
  });

  it('keeps only the latest of sequential saves for the same date', () => {
    let gratitude = saveEntry(journal(), '2026-08-21', 'first draft', WRITTEN_AT);
    gratitude = saveEntry(gratitude, '2026-08-21', 'second draft', WRITTEN_AT);
    expect(gratitude.entries['2026-08-21'].text).toBe('second draft');
  });

  it('tears the page out when the text is emptied, leaving a tombstone and other days alone', () => {
    let gratitude = journal('2026-08-20', '2026-08-21');
    gratitude = saveEntry(gratitude, '2026-08-21', '', WRITTEN_AT);
    expect(gratitude.entries['2026-08-21']).toBeUndefined();
    expect(hasEntry(gratitude.entries, '2026-08-21')).toBe(false);
    expect(gratitude.entries['2026-08-20'].text).toBe('grateful');
    expect(gratitude.tombstones).toEqual({ '2026-08-21': WRITTEN_AT });

    expect(saveEntry(gratitude, '2026-08-21', '', WRITTEN_AT)).toBe(gratitude);
  });

  it('writes a torn-out morning again, spending its tombstone', () => {
    const torn = saveEntry(journal('2026-08-21'), '2026-08-21', '', WRITTEN_AT);
    const rewritten = saveEntry(torn, '2026-08-21', 'after all', LATER);
    expect(rewritten.entries['2026-08-21'].text).toBe('after all');
    expect(rewritten.tombstones).toEqual({});
  });

  it('keeps a whitespace-only draft on the page without counting it as written', () => {
    const { entries } = saveEntry(journal('2026-08-21'), '2026-08-21', ' ', WRITTEN_AT);
    expect(entries['2026-08-21'].text).toBe(' ');
    expect(hasEntry(entries, '2026-08-21')).toBe(false);
  });
});

describe('mergeGratitude', () => {
  it('keeps the mornings each device wrote, and the later writing of one both edited', () => {
    const phone = saveEntry(journal('2026-08-19'), '2026-08-21', 'on the phone', WRITTEN_AT);
    const ipad = saveEntry(journal('2026-08-20'), '2026-08-21', 'on the iPad', LATER);
    const merged = mergeGratitude(phone, ipad);
    expect(Object.keys(merged.entries)).toEqual(['2026-08-19', '2026-08-20', '2026-08-21']);
    expect(merged.entries['2026-08-21'].text).toBe('on the iPad');
    expect(merged).toEqual(mergeGratitude(ipad, phone));
  });

  it('tears a morning out of the other device when it was emptied after its last writing', () => {
    const phone = journal('2026-08-21');
    const ipad = saveEntry(journal('2026-08-21'), '2026-08-21', '', LATER);
    expect(mergeGratitude(phone, ipad).entries).toEqual({});
    expect(mergeGratitude(phone, ipad).tombstones).toEqual({ '2026-08-21': LATER });
  });

  it('keeps a morning rewritten after it was torn out elsewhere', () => {
    const torn = saveEntry(journal('2026-08-21'), '2026-08-21', '', WRITTEN_AT);
    const rewritten = saveEntry(journal(), '2026-08-21', 'after all', LATER);
    const merged = mergeGratitude(torn, rewritten);
    expect(merged.entries['2026-08-21'].text).toBe('after all');
    expect(merged.tombstones).toEqual({});
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
