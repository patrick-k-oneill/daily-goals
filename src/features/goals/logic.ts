import { newId } from '@/lib/id';
import { formatPadDate, formatWeekRange, weekKeyOf, yearKeyOf, type DayKey } from '@/lib/dates';

import type { Cadence, CheckState, GoalEntry, GoalTemplate, Goals } from './types';

/** A goal line holds between one and this many checks. */
export const MAX_CHECKS = 10;

export function periodKeyFor(cadence: Cadence, day: DayKey): string {
  switch (cadence) {
    case 'daily':
      return day;
    case 'weekly':
      return weekKeyOf(day);
    case 'annual':
      return yearKeyOf(day);
  }
}

/** What the section's corner says for the period containing `day`. */
export function periodLabel(cadence: Cadence, day: DayKey): string {
  switch (cadence) {
    case 'daily':
      return formatPadDate(day);
    case 'weekly':
      return formatWeekRange(day);
    case 'annual':
      return yearKeyOf(day);
  }
}

/** The lines on one period's section: starred first, then pad writing order. */
export function entriesForPeriod(entries: GoalEntry[], periodKey: string): GoalEntry[] {
  return entries.filter((e) => e.periodKey === periodKey).sort(byPadOrder);
}

/** The recurring goals from the legal pad, as first-run defaults. */
export function seedGoals(): Goals {
  const seed = (
    cadence: Cadence,
    title: string,
    targetCount: number,
    sortOrder: number,
    checkLabels?: string[],
  ): GoalTemplate => ({
    id: newId(),
    cadence,
    title,
    targetCount,
    checkLabels,
    active: true,
    sortOrder,
  });

  return {
    templates: [
      seed('daily', 'Recurring Dailies', 1, 1),
      seed('daily', 'Daily Prod', 8, 2),
      seed('weekly', 'Recurring Dailies', 7, 1),
      seed('weekly', 'Fitness', 7, 2, ['Legs', 'Push', 'Pull', 'Legs', 'Push', 'Pull', 'Core']),
      seed('weekly', 'Weekly Prod', 6, 3),
    ],
    entries: [],
  };
}

/**
 * Materialize active templates onto a period's section — but only the period
 * containing `today`: a past page renders exactly what was written on it, like
 * paper. Idempotent; returns the same `goals` when nothing is missing.
 */
export function ensurePeriod(
  goals: Goals,
  cadence: Cadence,
  periodKey: string,
  today: DayKey,
): Goals {
  if (periodKeyFor(cadence, today) !== periodKey) return goals;

  const instantiated = new Set<string>();
  for (const e of goals.entries) {
    if (e.periodKey === periodKey && e.templateId) instantiated.add(e.templateId);
  }

  const additions: GoalEntry[] = [];
  for (const t of goals.templates) {
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
  if (additions.length === 0) return goals;
  return { templates: goals.templates, entries: [...goals.entries, ...additions] };
}

export interface AddGoalInput {
  cadence: Cadence;
  periodKey: string;
  title: string;
  targetCount: number;
  /** Also create a template so the goal reappears every new period. */
  repeats: boolean;
}

/** Write a new line at the bottom of a period's section. A blank title writes nothing. */
export function addGoal(goals: Goals, input: AddGoalInput): Goals {
  const title = input.title.trim();
  if (!title) return goals;

  const { cadence, periodKey } = input;
  const sortOrder = nextSortOrder([
    ...goals.entries.filter((e) => e.periodKey === periodKey),
    ...goals.templates.filter((t) => t.cadence === cadence),
  ]);
  const targetCount = clampChecks(input.targetCount);

  const template: GoalTemplate | undefined = input.repeats
    ? { id: newId(), cadence, title, targetCount, active: true, sortOrder }
    : undefined;
  const entry: GoalEntry = {
    id: newId(),
    templateId: template?.id,
    cadence,
    periodKey,
    title,
    checks: emptyChecks(targetCount),
    starred: false,
    sortOrder,
  };

  return {
    templates: template ? [...goals.templates, template] : goals.templates,
    entries: [...goals.entries, entry],
  };
}

/** One pen tap on a check: empty → done → missed → empty. */
export function cycleCheck(goals: Goals, entryId: string, checkIndex: number): Goals {
  return mapEntry(goals, entryId, (e) => ({
    ...e,
    checks: e.checks.map((c, i) => (i === checkIndex ? cycleState(c) : c)),
  }));
}

export function toggleStar(goals: Goals, entryId: string): Goals {
  return mapEntry(goals, entryId, (e) => ({ ...e, starred: !e.starred }));
}

export interface GoalEditPatch {
  title?: string;
  targetCount?: number;
}

/**
 * Edit a line in place. Edits to a recurring goal also update its template so
 * future pages inherit the new title and check count. A blank title keeps the
 * old one; existing marks survive a resize.
 */
export function updateGoal(goals: Goals, entryId: string, patch: GoalEditPatch): Goals {
  const entry = goals.entries.find((e) => e.id === entryId);
  if (!entry) return goals;

  const title = patch.title?.trim() || entry.title;
  const targetCount = clampChecks(patch.targetCount ?? entry.checks.length);

  return {
    entries: goals.entries.map((e) =>
      e.id === entryId ? { ...e, title, checks: resizeChecks(e.checks, targetCount) } : e,
    ),
    templates: entry.templateId
      ? goals.templates.map((t) => (t.id === entry.templateId ? { ...t, title, targetCount } : t))
      : goals.templates,
  };
}

/**
 * Cross a line off the page. Removing a recurring goal also retires its
 * template, so it neither returns to this page nor appears on future ones.
 */
export function removeGoal(goals: Goals, entryId: string): Goals {
  const entry = goals.entries.find((e) => e.id === entryId);
  if (!entry) return goals;

  return {
    entries: goals.entries.filter((e) => e.id !== entryId),
    templates: entry.templateId
      ? goals.templates.map((t) => (t.id === entry.templateId ? { ...t, active: false } : t))
      : goals.templates,
  };
}

function mapEntry(goals: Goals, entryId: string, update: (e: GoalEntry) => GoalEntry): Goals {
  if (!goals.entries.some((e) => e.id === entryId)) return goals;
  return {
    templates: goals.templates,
    entries: goals.entries.map((e) => (e.id === entryId ? update(e) : e)),
  };
}

function clampChecks(targetCount: number): number {
  return Math.min(MAX_CHECKS, Math.max(1, targetCount));
}

function emptyChecks(targetCount: number): CheckState[] {
  return Array.from({ length: clampChecks(targetCount) }, () => 'empty' as CheckState);
}

function resizeChecks(checks: CheckState[], targetCount: number): CheckState[] {
  if (targetCount <= checks.length) return checks.slice(0, targetCount);
  return [...checks, ...emptyChecks(targetCount - checks.length)];
}

function cycleState(state: CheckState): CheckState {
  switch (state) {
    case 'empty':
      return 'done';
    case 'done':
      return 'missed';
    case 'missed':
      return 'empty';
  }
}

/** Starred items float to the top, then pad writing order. */
function byPadOrder(a: GoalEntry, b: GoalEntry): number {
  if (a.starred !== b.starred) return a.starred ? -1 : 1;
  return a.sortOrder - b.sortOrder;
}

function nextSortOrder(items: { sortOrder: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}
