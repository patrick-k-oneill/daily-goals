import { Spacing } from '@/constants/theme';

import type { GoalEntry } from '../types';

/** The pad checkbox is a fixed square; rows are fitted around it. */
export const CHECK_BOX_SIZE = 28;
export const CHECK_BOX_GAP = Spacing.one;
/** A check label's 10pt type runs about this wide per character. */
const LABEL_CHAR_WIDTH = 6;

/**
 * Minimum room a title needs before inline is worth it. 160 makes 7-check
 * goals stack at true phone widths (402pt iPhone rows ≈ 344pt) while
 * everything seeded stays inline in the pad-width column (rows ≈ 598pt).
 */
export const MIN_INLINE_TITLE_WIDTH = 160;

export type GoalRowLayout = 'inline' | 'stacked';

/** What the fit rule reads off a row: its checks and any labels over them. */
export type RowChecks = Pick<GoalEntry, 'checks' | 'checkLabels'>;

/** A column is its box, or its label when that runs wider. */
function checkColumnWidth(label: string | undefined): number {
  return Math.max(CHECK_BOX_SIZE, (label?.length ?? 0) * LABEL_CHAR_WIDTH);
}

function checksGroupWidth({ checks, checkLabels }: RowChecks): number {
  const columns = checks.reduce((sum, _, i) => sum + checkColumnWidth(checkLabels?.[i]), 0);
  return columns + Math.max(0, checks.length - 1) * CHECK_BOX_GAP;
}

/**
 * Inline keeps star · checks · title on one ruled line; stacked puts the
 * title on line 1 and the checks group on line 2. An unmeasured row
 * (width ≤ 0) stays inline — the desktop default — until onLayout reports.
 */
export function goalRowLayout(rowWidth: number, row: RowChecks): GoalRowLayout {
  if (rowWidth <= 0) return 'inline';
  return checksGroupWidth(row) + MIN_INLINE_TITLE_WIDTH <= rowWidth ? 'inline' : 'stacked';
}

/**
 * One rhythm per section: if any multi-check row must stack at this width,
 * every multi-check row in the list stacks with it, so adjacent lines never
 * flip between checks-first and title-first. Single-check rows stay inline.
 */
export function goalListLayouts(rowWidth: number, rows: RowChecks[]): GoalRowLayout[] {
  const multi = (row: RowChecks) => row.checks.length >= 2;
  const anyStacked = rows.some((row) => multi(row) && goalRowLayout(rowWidth, row) === 'stacked');
  return rows.map((row) => (multi(row) && anyStacked ? 'stacked' : 'inline'));
}
