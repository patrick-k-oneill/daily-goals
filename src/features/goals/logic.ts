import { newId } from '@/lib/id';
import { weekKeyOf, yearKeyOf, type DayKey } from '@/lib/dates';

import type { Cadence, CheckState, GoalEntry, GoalTemplate } from './types';

export function periodKeyFor(cadence: Cadence, dayKey: DayKey): string {
  switch (cadence) {
    case 'daily':
      return dayKey;
    case 'weekly':
      return weekKeyOf(dayKey);
    case 'annual':
      return yearKeyOf(dayKey);
  }
}

/** A period is "current" when it contains today — the only period templates materialize into. */
export function isCurrentPeriod(cadence: Cadence, periodKey: string, today: DayKey): boolean {
  return periodKeyFor(cadence, today) === periodKey;
}

/** Box size and gap must match check-box.tsx and goal-row.tsx checks styles. */
export const CHECK_BOX_SIZE = 28;
export const CHECK_BOX_GAP = 4;

/**
 * Minimum room a real title needs before inline is worth it. 160 makes
 * 7-check goals stack at true phone widths (402pt iPhone rows ≈ 344pt)
 * while everything seeded stays inline on desktop rows (≈ 650pt).
 */
const MIN_INLINE_TITLE_WIDTH = 160;

export type GoalRowLayout = 'inline' | 'stacked';

export function checksGroupWidth(checkCount: number): number {
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

export function emptyChecks(targetCount: number): CheckState[] {
  return Array.from({ length: Math.max(1, targetCount) }, () => 'empty' as CheckState);
}

/**
 * Entries that active templates should contribute to a period but that don't
 * exist yet. Idempotent: templates already instantiated produce nothing.
 */
export function missingEntries(
  templates: GoalTemplate[],
  existing: GoalEntry[],
  cadence: Cadence,
  periodKey: string,
): GoalEntry[] {
  const instantiated = new Set<string>();
  for (const e of existing) {
    if (e.periodKey === periodKey && e.templateId) instantiated.add(e.templateId);
  }

  const additions: GoalEntry[] = [];
  for (const t of templates) {
    if (!t.active || t.cadence !== cadence || instantiated.has(t.id)) continue;
    additions.push({
      id: newId(),
      templateId: t.id,
      cadence,
      periodKey,
      title: t.title,
      checks: emptyChecks(t.targetCount),
      checkLabels: t.checkLabels,
      starred: false,
      sortOrder: t.sortOrder,
    });
  }
  return additions;
}

export function cycleState(state: CheckState): CheckState {
  switch (state) {
    case 'empty':
      return 'done';
    case 'done':
      return 'missed';
    case 'missed':
      return 'empty';
  }
}

/** Resize a checks array in place-preserving fashion when the target changes. */
export function resizeChecks(checks: CheckState[], targetCount: number): CheckState[] {
  const size = Math.max(1, targetCount);
  if (size <= checks.length) return checks.slice(0, size);
  return [...checks, ...emptyChecks(size - checks.length)];
}

export interface GoalEditPatch {
  title?: string;
  targetCount?: number;
}

/**
 * Apply an in-place edit to a goal entry. Edits to a recurring goal also
 * update its template, so future pages inherit the new title/target.
 */
export function applyGoalEdit(
  entries: GoalEntry[],
  templates: GoalTemplate[],
  entryId: string,
  patch: GoalEditPatch,
): { entries: GoalEntry[]; templates: GoalTemplate[] } {
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return { entries, templates };

  const title = patch.title?.trim() || entry.title;
  const targetCount = patch.targetCount ?? entry.checks.length;

  return {
    entries: entries.map((e) =>
      e.id === entryId ? { ...e, title, checks: resizeChecks(e.checks, targetCount) } : e,
    ),
    templates: entry.templateId
      ? templates.map((t) => (t.id === entry.templateId ? { ...t, title, targetCount } : t))
      : templates,
  };
}

export function doneCount(entry: GoalEntry): number {
  return entry.checks.filter((c) => c === 'done').length;
}

export function entriesForPeriod(entries: GoalEntry[], periodKey: string): GoalEntry[] {
  return entries.filter((e) => e.periodKey === periodKey).sort(byPadOrder);
}

/** Starred items float to the top, then pad writing order. */
function byPadOrder(a: GoalEntry, b: GoalEntry): number {
  if (a.starred !== b.starred) return a.starred ? -1 : 1;
  return a.sortOrder - b.sortOrder;
}

export function nextSortOrder(items: { sortOrder: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}
