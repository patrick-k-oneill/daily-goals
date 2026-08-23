import {
  addDays,
  addMonths,
  dayKeyOf,
  daysOfWeek,
  formatMonth,
  formatPadDate,
  formatWeekRange,
  monthGrid,
  monthStart,
  parseDayKey,
  weekdayIndex,
  weekKeyOf,
  weekStart,
  yearKeyOf,
} from './dates';

describe('day keys', () => {
  it('round-trips through Date in local time', () => {
    expect(dayKeyOf(parseDayKey('2026-08-21'))).toBe('2026-08-21');
    expect(dayKeyOf(parseDayKey('2026-01-01'))).toBe('2026-01-01');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-08-21', 7)).toBe('2026-08-28');
  });
});

describe('ISO weeks', () => {
  it('computes the week key from a day', () => {
    // The legal-pad date: Fri 8/21/26 falls in ISO week 34.
    expect(weekKeyOf('2026-08-21')).toBe('2026-W34');
    expect(weekKeyOf('2026-01-01')).toBe('2026-W01');
  });

  it('assigns early January to the prior ISO year when applicable', () => {
    // Jan 1 2027 is a Friday, so it belongs to 2026's final week.
    expect(weekKeyOf('2027-01-01')).toBe('2026-W53');
  });

  it('weeks start on Monday', () => {
    expect(weekStart('2026-08-21')).toBe('2026-08-17');
    expect(weekdayIndex('2026-08-17')).toBe(0);
    expect(weekdayIndex('2026-08-23')).toBe(6);
    expect(daysOfWeek('2026-08-21')).toHaveLength(7);
    expect(daysOfWeek('2026-08-21')[6]).toBe('2026-08-23');
  });
});

describe('month grids', () => {
  it('finds the month start and steps between months', () => {
    expect(monthStart('2026-08-22')).toBe('2026-08-01');
    expect(addMonths('2026-08-22', 1)).toBe('2026-09-01');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01');
    expect(addMonths('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('lays out August 2026 with leading and trailing blanks', () => {
    const grid = monthGrid('2026-08-22');
    expect(grid).toHaveLength(6);
    // Aug 1 2026 is a Saturday: five blanks lead the first week.
    expect(grid[0]).toEqual([null, null, null, null, null, '2026-08-01', '2026-08-02']);
    expect(grid[5][0]).toBe('2026-08-31');
    expect(grid[5].slice(1)).toEqual([null, null, null, null, null, null]);
  });

  it('lays out a month that fits exactly in four weeks', () => {
    // Feb 2027 starts on a Monday and has 28 days.
    const grid = monthGrid('2027-02-10');
    expect(grid).toHaveLength(4);
    expect(grid[0][0]).toBe('2027-02-01');
    expect(grid[3][6]).toBe('2027-02-28');
    expect(grid.flat().filter(Boolean)).toHaveLength(28);
  });

  it('formats the month heading', () => {
    expect(formatMonth('2026-08-22')).toBe('August 2026');
  });
});

describe('formatting', () => {
  it('writes the date the way the pad does', () => {
    expect(formatPadDate('2026-08-21')).toBe('Fri 8/21/26');
  });

  it('formats week ranges within and across months', () => {
    expect(formatWeekRange('2026-08-21')).toBe('Aug 17 – 23');
    expect(formatWeekRange('2026-09-01')).toBe('Aug 31 – Sep 6');
  });

  it('extracts the year key', () => {
    expect(yearKeyOf('2026-08-21')).toBe('2026');
  });
});
