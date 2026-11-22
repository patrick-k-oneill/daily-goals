import { revealOffset } from './keyboard-reveal';

const MARGIN = 12;
const VISIBLE_HEIGHT = 400;

describe('revealOffset', () => {
  it('scrolls a box under the keyboard up until its bottom clears it by the margin', () => {
    expect(revealOffset({ top: 500, bottom: 700 }, VISIBLE_HEIGHT, 150, MARGIN)).toBe(312);
  });

  it('stays put when the box already sits above the keyboard', () => {
    expect(revealOffset({ top: 200, bottom: 400 }, VISIBLE_HEIGHT, 150, MARGIN)).toBe(150);
    expect(revealOffset({ top: 500, bottom: 700 }, VISIBLE_HEIGHT, 480, MARGIN)).toBe(480);
  });

  it('keeps the top of a box taller than the visible page in view', () => {
    expect(revealOffset({ top: 500, bottom: 1000 }, VISIBLE_HEIGHT, 150, MARGIN)).toBe(488);
  });

  it('never scrolls above the start of the page', () => {
    expect(revealOffset({ top: 4, bottom: 600 }, VISIBLE_HEIGHT, 0, MARGIN)).toBe(0);
  });
});
