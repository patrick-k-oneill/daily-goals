import { dragSlots, roomBeside, slotAt, type RowBox } from './reorder-geometry';

const GAP = 2;

/** Rows of the given heights stacked `GAP` apart from y = 10, as a list lays them out. */
function stack(heights: number[]): RowBox[] {
  let y = 10;
  return heights.map((height) => {
    const box = { y, height };
    y += height + GAP;
    return box;
  });
}

describe('dragSlots', () => {
  it('puts slot i where the lifted row sits with i other rows packed above it', () => {
    expect(dragSlots(stack([40, 60, 40]), 0, GAP).tops).toEqual([10, 72, 114]);
    expect(dragSlots(stack([40, 60, 40]), 1, GAP).tops).toEqual([10, 52, 94]);
  });

  it("makes the lifted row's own slot the place it was lifted from", () => {
    const rows = stack([40, 60, 28, 44]);
    rows.forEach((row, from) => {
      expect(dragSlots(rows, from, GAP).tops[from]).toBe(row.y);
    });
  });

  it('sets each threshold midway between neighboring slots', () => {
    const { tops, thresholds } = dragSlots(stack([40, 60, 40]), 0, GAP);
    expect(thresholds).toEqual([(tops[0] + tops[1]) / 2, (tops[1] + tops[2]) / 2]);
  });

  it('gives a list of one row its single slot', () => {
    expect(dragSlots(stack([40]), 0, GAP)).toEqual({ tops: [10], thresholds: [] });
  });
});

describe('slotAt', () => {
  const { tops, thresholds } = dragSlots(stack([40, 60, 40]), 0, GAP);

  it('settles the row in the slot whose top is nearest', () => {
    for (let top = tops[0] - 20; top <= tops[2] + 20; top += 1) {
      const distances = tops.map((slotTop) => Math.abs(slotTop - top));
      expect(distances[slotAt(thresholds, top)]).toBe(Math.min(...distances));
    }
  });

  it('holds the first slot above the list and the last below it', () => {
    expect(slotAt(thresholds, -500)).toBe(0);
    expect(slotAt(thresholds, 5000)).toBe(2);
  });
});

describe('roomBeside', () => {
  const heights = [40, 60, 28, 44];

  /** Where the free room starts once the other rows are laid out with the room `roomBeside` opens. */
  function freeRoomTop(from: number, slot: number): number | undefined {
    const rows = stack(heights);
    const room = rows[from].height + GAP;
    let y = rows[0].y;
    let free: number | undefined;
    rows.forEach((row, index) => {
      if (index === from) return;
      const side = roomBeside(index, from, slot, rows.length);
      if (side === 'above') {
        free = y;
        y += room;
      }
      y += row.height + GAP;
      if (side === 'below') free = y;
    });
    return free;
  }

  it("opens exactly the lifted row's slot, whichever row is lifted and wherever it hovers", () => {
    const rows = stack(heights);
    rows.forEach((_, from) => {
      const { tops } = dragSlots(rows, from, GAP);
      tops.forEach((top, slot) => expect(freeRoomTop(from, slot)).toBe(top));
    });
  });

  it('opens room beside one row only', () => {
    const sides = [1, 2, 3].map((index) => roomBeside(index, 0, 3, 4));
    expect(sides).toEqual([null, null, 'below']);
  });
});
