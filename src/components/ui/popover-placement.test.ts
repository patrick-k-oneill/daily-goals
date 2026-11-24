import { placePopover } from './popover-placement';

const WINDOW = { width: 800, height: 600 };

describe('placePopover', () => {
  it('opens just under its anchor, flush with the anchor’s left edge', () => {
    expect(placePopover({ x: 120, y: 60, height: 30 }, 300, WINDOW)).toEqual({
      left: 120,
      top: 94,
      width: 300,
      maxHeight: 498,
    });
  });

  it('slides left to stay inside the window’s right edge', () => {
    expect(placePopover({ x: 700, y: 60, height: 30 }, 300, WINDOW).left).toBe(492);
  });

  it('never starts left of the window’s margin', () => {
    expect(placePopover({ x: 2, y: 60, height: 30 }, 300, WINDOW).left).toBe(8);
  });

  it('narrows to a window that is narrower than it', () => {
    const placement = placePopover({ x: 40, y: 60, height: 30 }, 500, { width: 390, height: 844 });
    expect(placement).toMatchObject({ left: 8, width: 374 });
  });

  it('is no taller than the room under its anchor', () => {
    expect(placePopover({ x: 40, y: 400, height: 30 }, 300, WINDOW).maxHeight).toBe(158);
    expect(placePopover({ x: 40, y: 590, height: 30 }, 300, WINDOW).maxHeight).toBe(0);
  });
});
