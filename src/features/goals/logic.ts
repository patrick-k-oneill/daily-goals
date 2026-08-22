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
