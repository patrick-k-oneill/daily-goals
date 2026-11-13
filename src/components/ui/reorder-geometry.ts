/** A row's measured place in its list: its top edge and its height. */
export interface RowBox {
  y: number;
  height: number;
}

/**
 * Where a lifted row can settle. `tops[i]` is its top edge at index i with
 * the other rows packed around it; it settles in the slot whose top is
 * nearest, so `thresholds[i]` is the midpoint between slot i and slot i + 1.
 */
export interface DragSlots {
  tops: number[];
  thresholds: number[];
}

/** The slots for the row lifted from index `from` of `rows`, which sit `gap` apart. */
export function dragSlots(rows: RowBox[], from: number, gap: number): DragSlots {
  const others = rows.filter((_, i) => i !== from);
  const tops = [rows[0].y];
  for (const row of others) tops.push(tops[tops.length - 1] + row.height + gap);
  const thresholds = others.map((row, i) => tops[i] + (row.height + gap) / 2);
  return { tops, thresholds };
}

/** The slot a lifted row settles in when its top edge is at `top`. */
export function slotAt(thresholds: number[], top: number): number {
  'worklet';
  let slot = 0;
  while (slot < thresholds.length && top > thresholds[slot]) slot += 1;
  return slot;
}

/**
 * Which side of the row at `index` opens up to leave the lifted row's slot
 * free: above the row that follows the slot, or below the last row when the
 * slot is the end of the list. `index` is never `from`, the lifted row's own.
 */
export function roomBeside(
  index: number,
  from: number,
  slot: number,
  count: number,
): 'above' | 'below' | null {
  const position = index < from ? index : index - 1;
  const lastPosition = count - 2;
  if (position === slot) return 'above';
  if (position === lastPosition && slot === count - 1) return 'below';
  return null;
}
