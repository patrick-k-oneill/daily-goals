import { achievedFlourishInset, STAR_CORNER } from './achieved-flourish-layout';

describe('achievedFlourishInset', () => {
  it('keeps no room clear at 100%, where the page margin holds the star', () => {
    expect(achievedFlourishInset(1)).toBe(0);
  });

  it("keeps clear what a larger text size adds to the star's reach past the title", () => {
    const reachAt = (scale: number) => -STAR_CORNER.right * scale;
    expect(achievedFlourishInset(1.5)).toBe(reachAt(1.5) - reachAt(1));
    expect(achievedFlourishInset(2)).toBe(18);
  });
});
