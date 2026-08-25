import { msUntilNextMidnight } from './clock';

describe('msUntilNextMidnight', () => {
  it('counts down to the next local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 7, 21, 23, 59, 0))).toBe(60_000);
    expect(msUntilNextMidnight(new Date(2026, 7, 21, 0, 0, 0))).toBe(86_400_000);
  });

  it('spans month and year boundaries', () => {
    expect(msUntilNextMidnight(new Date(2026, 11, 31, 23, 0, 0))).toBe(3_600_000);
  });
});
