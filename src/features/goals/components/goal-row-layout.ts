import { Spacing } from '@/constants/theme';

/** The pad checkbox is a fixed square; rows are fitted around it. */
export const CHECK_BOX_SIZE = 28;
export const CHECK_BOX_GAP = Spacing.one;

/**
 * Minimum room a title needs before inline is worth it. 160 makes 7-check
 * goals stack at true phone widths (402pt iPhone rows ≈ 344pt) while
 * everything seeded stays inline on desktop rows (≈ 650pt).
 */
export const MIN_INLINE_TITLE_WIDTH = 160;

export type GoalRowLayout = 'inline' | 'stacked';

function checksGroupWidth(checkCount: number): number {
  const count = Math.max(1, checkCount);
  return count * CHECK_BOX_SIZE + (count - 1) * CHECK_BOX_GAP;
}

/**
 * Inline keeps star · checks · title on one ruled line; stacked puts the
 * title on line 1 and the checks group on line 2. An unmeasured row
 * (width ≤ 0) stays inline — the desktop default — until onLayout reports.
 */
export function goalRowLayout(rowWidth: number, checkCount: number): GoalRowLayout {
  if (rowWidth <= 0) return 'inline';
  return checksGroupWidth(checkCount) + MIN_INLINE_TITLE_WIDTH <= rowWidth ? 'inline' : 'stacked';
}

/**
 * One rhythm per section: if any multi-check row must stack at this width,
 * every multi-check row in the list stacks with it, so adjacent lines never
 * flip between checks-first and title-first. Single-check rows stay inline.
 */
export function goalListLayouts(rowWidth: number, checkCounts: number[]): GoalRowLayout[] {
  const anyStacked = checkCounts.some(
    (count) => count >= 2 && goalRowLayout(rowWidth, count) === 'stacked',
  );
  return checkCounts.map((count) => (count >= 2 && anyStacked ? 'stacked' : 'inline'));
}
