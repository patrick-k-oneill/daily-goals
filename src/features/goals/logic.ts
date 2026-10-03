import {
  dayKeyOf,
  formatPadDate,
  formatWeekRange,
  weekKeyOf,
  yearKeyOf,
  type DayKey,
} from '@/lib/dates';
import {
  isArrayOf,
  isBoolean,
  isNumber,
  isOneOf,
  isOptional,
  isRecord,
  isString,
  isTimestamp,
} from '@/lib/guards';
import { newId } from '@/lib/id';
import {
  EPOCH,
  isTombstones,
  mergeKeyed,
  withTombstone,
  type KeyOf,
  type Stamp,
} from '@/lib/merge';

import {
  CADENCES,
  CHECK_STATES,
  type Cadence,
  type CheckState,
  type GoalEntry,
  type GoalTemplate,
  type Goals,
  type LegacyGoalEntry,
  type LegacyGoals,
  type LegacyGoalTemplate,
} from './types';

/** A goal line holds between one and this many checks. */
export const MAX_CHECKS = 10;
/** A check label is a short word over its box, at most this many characters. */
export const MAX_CHECK_LABEL_LENGTH = 6;

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

/** The id every device gives a template's line on a period, so two copies of it are one line. */
export function materializedEntryId(templateId: string, periodKey: string): string {
  return `${templateId}:${periodKey}`;
}

function seedTemplateId(cadence: Cadence, sortOrder: number): string {
  return `seed:${cadence}:${sortOrder}`;
}

/** The recurring goals from the legal pad, as first-run defaults; the same ids on every device. */
export function seedGoals(): Goals {
  const seed = (
    cadence: Cadence,
    title: string,
    targetCount: number,
    sortOrder: number,
    checkLabels?: string[],
  ): GoalTemplate => ({
    id: seedTemplateId(cadence, sortOrder),
    cadence,
    title,
    targetCount,
    checkLabels,
    sortOrder,
    updatedAt: EPOCH,
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
    tombstones: {},
  };
}

/**
 * Materialize active templates onto a period's section — but only the period
 * containing `today`: a past page renders exactly what was written on it, like
 * paper. A line crossed off stays off. Idempotent; returns the same `goals`
 * when nothing is missing.
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
    if (t.retiredAt || t.cadence !== cadence || instantiated.has(t.id)) continue;
    const id = materializedEntryId(t.id, periodKey);
    if (id in goals.tombstones) continue;
    additions.push({
      id,
      templateId: t.id,
      cadence,
      periodKey,
      title: t.title,
      checks: emptyChecks(t.targetCount),
      checkLabels: t.checkLabels,
      starred: false,
      sortOrder: t.sortOrder,
      updatedAt: EPOCH,
    });
  }
  if (additions.length === 0) return goals;
  return { ...goals, entries: [...goals.entries, ...additions] };
}

/**
 * Today's page, fully written: every active template has its line on the
 * current period of its cadence. The one door onto today — for a rehydrated
 * pad, the turning clock, and an imported pad alike. Idempotent.
 */
export function materializeToday(goals: Goals, today: DayKey): Goals {
  return CADENCES.reduce(
    (state, cadence) => ensurePeriod(state, cadence, periodKeyFor(cadence, today), today),
    goals,
  );
}

export interface AddGoalInput {
  cadence: Cadence;
  periodKey: string;
  title: string;
  targetCount: number;
  /** One label per check by position; the core trims, caps and fits them to the count. */
  checkLabels?: string[];
  /** Also create a template so the goal reappears every new period. */
  repeats: boolean;
}

/** Write a new line at the bottom of a period's section. A blank title writes nothing. */
export function addGoal(goals: Goals, input: AddGoalInput, now: Stamp): Goals {
  const title = input.title.trim();
  if (!title) return goals;

  const { cadence, periodKey } = input;
  const sortOrder = nextSortOrder([
    ...goals.entries.filter((e) => e.periodKey === periodKey),
    ...goals.templates.filter((t) => t.cadence === cadence),
  ]);
  const targetCount = clampChecks(input.targetCount);
  const checkLabels = fitCheckLabels(input.checkLabels, targetCount);

  const template: GoalTemplate | undefined = input.repeats
    ? { id: newId(), cadence, title, targetCount, checkLabels, sortOrder, updatedAt: now }
    : undefined;
  const entry: GoalEntry = {
    id: template ? materializedEntryId(template.id, periodKey) : newId(),
    templateId: template?.id,
    cadence,
    periodKey,
    title,
    checks: emptyChecks(targetCount),
    checkLabels,
    starred: false,
    sortOrder,
    updatedAt: now,
  };

  return {
    ...goals,
    templates: template ? [...goals.templates, template] : goals.templates,
    entries: [...goals.entries, entry],
  };
}

/** One pen tap on a check: empty → done → missed → empty. */
export function cycleCheck(goals: Goals, entryId: string, checkIndex: number, now: Stamp): Goals {
  return mapEntry(goals, entryId, (e) => ({
    ...e,
    checks: e.checks.map((c, i) => (i === checkIndex ? cycleState(c) : c)),
    updatedAt: now,
  }));
}

export function toggleStar(goals: Goals, entryId: string, now: Stamp): Goals {
  return mapEntry(goals, entryId, (e) => ({ ...e, starred: !e.starred, updatedAt: now }));
}

export interface GoalEditPatch {
  title?: string;
  targetCount?: number;
  /** Replaces the line's labels; omit to keep them, fitted to the new count. */
  checkLabels?: string[];
}

/**
 * Edit a line in place. Edits to a recurring goal also update its template so
 * future pages inherit the new title, check count and labels. A blank title
 * keeps the old one; existing marks survive a resize and labels follow it.
 */
export function updateGoal(goals: Goals, entryId: string, patch: GoalEditPatch, now: Stamp): Goals {
  const entry = goals.entries.find((e) => e.id === entryId);
  if (!entry) return goals;

  const title = patch.title?.trim() || entry.title;
  const targetCount = clampChecks(patch.targetCount ?? entry.checks.length);
  const checkLabels = fitCheckLabels(patch.checkLabels ?? entry.checkLabels, targetCount);

  return {
    ...goals,
    entries: goals.entries.map((e) =>
      e.id === entryId
        ? { ...e, title, checks: resizeChecks(e.checks, targetCount), checkLabels, updatedAt: now }
        : e,
    ),
    templates: entry.templateId
      ? goals.templates.map((t) =>
          t.id === entry.templateId ? { ...t, title, targetCount, checkLabels, updatedAt: now } : t,
        )
      : goals.templates,
  };
}

/** Whether any box on a line carries a label. */
export function hasCheckLabels(checkLabels: string[] | undefined): boolean {
  return checkLabels?.some((label) => label.trim().length > 0) ?? false;
}

/**
 * Cross a line off the page, leaving a tombstone so no copy of it comes back.
 * Removing a recurring goal also retires its template, so it neither returns
 * to this page nor appears on future ones.
 */
export function removeGoal(goals: Goals, entryId: string, now: Stamp): Goals {
  const entry = goals.entries.find((e) => e.id === entryId);
  if (!entry) return goals;

  return {
    entries: goals.entries.filter((e) => e.id !== entryId),
    tombstones: withTombstone(goals.tombstones, entryId, now),
    templates: entry.templateId
      ? goals.templates.map((t) =>
          t.id === entry.templateId ? { ...t, retiredAt: now, updatedAt: now } : t,
        )
      : goals.templates,
  };
}

const byId: KeyOf<GoalTemplate | GoalEntry> = { key: (x) => x.id, stamp: (x) => x.updatedAt };

/**
 * Reconcile two copies of the goals, item by item (ADR 0005): templates and
 * entries each by id, the later write winning, crossed-off lines staying off.
 * A line a stale device wrote for a template after it was retired is dropped.
 */
export function mergeGoals(local: Goals, remote: Goals): Goals {
  const templates = mergeKeyed(
    { items: local.templates, tombstones: {} },
    { items: remote.templates, tombstones: {} },
    byId,
  ).items;
  const entries = mergeKeyed(
    { items: local.entries, tombstones: local.tombstones },
    { items: remote.entries, tombstones: remote.tombstones },
    byId,
  );
  const retired = new Map(
    templates.flatMap((t) => (t.retiredAt ? [[t.id, t.retiredAt] as const] : [])),
  );
  return {
    templates,
    entries: entries.items.filter((e) => !isGhost(e, retired)),
    tombstones: entries.tombstones,
  };
}

/**
 * The pad as persisted before stamps, brought into shape: everything stamped
 * `now` (the moment this device first knew it), seed templates and materialized
 * lines given the ids every device shares, retirements marked at the epoch.
 */
export function upgradeLegacyGoals(legacy: LegacyGoals, now: Stamp): Goals {
  const seedIds = new Set(seedGoals().templates.map((t) => t.id));
  const templateIds = new Map(
    legacy.templates.map((t) => {
      const seedId = seedTemplateId(t.cadence, t.sortOrder);
      return [t.id, seedIds.has(seedId) ? seedId : t.id];
    }),
  );

  const templates = legacy.templates.map(({ active, ...t }) => ({
    ...t,
    id: templateIds.get(t.id) ?? t.id,
    updatedAt: now,
    ...(active ? {} : { retiredAt: EPOCH }),
  }));
  const entries = legacy.entries.map((e) => {
    if (!e.templateId) return { ...e, updatedAt: now };
    const templateId = templateIds.get(e.templateId) ?? e.templateId;
    return { ...e, id: materializedEntryId(templateId, e.periodKey), templateId, updatedAt: now };
  });
  return { templates, entries, tombstones: {} };
}

/**
 * An untouched materialized line on a period that began after its template
 * was retired: a stale device wrote it before it heard. Every device drops it
 * the same way, so it needs no tombstone.
 */
function isGhost(entry: GoalEntry, retired: Map<string, Stamp>): boolean {
  if (!entry.templateId || entry.updatedAt !== EPOCH) return false;
  const retiredAt = retired.get(entry.templateId);
  if (retiredAt === undefined) return false;
  return periodKeyFor(entry.cadence, dayKeyOf(new Date(retiredAt))) < entry.periodKey;
}

function mapEntry(goals: Goals, entryId: string, update: (e: GoalEntry) => GoalEntry): Goals {
  if (!goals.entries.some((e) => e.id === entryId)) return goals;
  return {
    ...goals,
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

/**
 * Labels are positional, one per check: trimmed and capped, trailing ones
 * dropped by a shrink, new boxes left blank by a grow. A one-check line has
 * none, and a line with nothing written over any box stores none.
 */
function fitCheckLabels(labels: string[] | undefined, targetCount: number): string[] | undefined {
  if (!labels || targetCount < 2) return undefined;
  const fitted = Array.from({ length: targetCount }, (_, i) =>
    (labels[i] ?? '').trim().slice(0, MAX_CHECK_LABEL_LENGTH),
  );
  return fitted.some(Boolean) ? fitted : undefined;
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

const isCadence = isOneOf(CADENCES);
const isCheckState = isOneOf(CHECK_STATES);
const isOptionalString = isOptional(isString);
const isOptionalStrings = isOptional(isArrayOf(isString));
const isOptionalTimestamp = isOptional(isTimestamp);

/** Goals as they arrive from a file — a pad file, a cloud file — in the current shape. */
export function isGoals(value: unknown): value is Goals {
  return (
    isRecord(value) &&
    isArrayOf(isGoalTemplate)(value.templates) &&
    isArrayOf(isGoalEntry)(value.entries) &&
    isTombstones(value.tombstones)
  );
}

/** Goals as a schema 1 pad file held them: `active` instead of `retiredAt`, no stamps, no tombstones. */
export function isLegacyGoals(value: unknown): value is LegacyGoals {
  return (
    isRecord(value) &&
    isArrayOf(isLegacyGoalTemplate)(value.templates) &&
    isArrayOf(isLegacyGoalEntry)(value.entries)
  );
}

export function isGoalTemplate(value: unknown): value is GoalTemplate {
  return (
    isRecord(value) &&
    hasTemplateFields(value) &&
    isOptionalTimestamp(value.retiredAt) &&
    isTimestamp(value.updatedAt)
  );
}

export function isGoalEntry(value: unknown): value is GoalEntry {
  return isRecord(value) && hasEntryFields(value) && isTimestamp(value.updatedAt);
}

function isLegacyGoalTemplate(value: unknown): value is LegacyGoalTemplate {
  return isRecord(value) && hasTemplateFields(value) && isBoolean(value.active);
}

function isLegacyGoalEntry(value: unknown): value is LegacyGoalEntry {
  return isRecord(value) && hasEntryFields(value);
}

/** The fields a template has had in every schema. */
function hasTemplateFields(value: Record<string, unknown>): boolean {
  return (
    isString(value.id) &&
    isCadence(value.cadence) &&
    isString(value.title) &&
    isNumber(value.targetCount) &&
    isOptionalStrings(value.checkLabels) &&
    isNumber(value.sortOrder)
  );
}

/** The fields an entry has had in every schema. */
function hasEntryFields(value: Record<string, unknown>): boolean {
  return (
    isString(value.id) &&
    isOptionalString(value.templateId) &&
    isCadence(value.cadence) &&
    isString(value.periodKey) &&
    isString(value.title) &&
    isArrayOf(isCheckState)(value.checks) &&
    isOptionalStrings(value.checkLabels) &&
    isBoolean(value.starred) &&
    isNumber(value.sortOrder)
  );
}
