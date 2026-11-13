import {
  addDays,
  dayKeyOf,
  formatDayWithWeekday,
  weekdayOf,
  weekKeyOf,
  yearKeyOf,
  type DayKey,
} from '@/lib/dates';
import { newId } from '@/lib/id';
import { EPOCH, LEGACY, mergeKeyed, withTombstone, type KeyOf, type Stamp } from '@/lib/merge';

import {
  CADENCES,
  type Cadence,
  type CheckState,
  type GoalEntry,
  type GoalTemplate,
  type Goals,
  type LegacyGoals,
  type StarredGoalEntry,
  type StarredGoals,
  type Suggestion,
} from './types';

/** A goal line holds between one and this many checks. */
export const MAX_CHECKS = 10;
/** A check label is a short word over its box, at most this many characters. */
export const MAX_CHECK_LABEL_LENGTH = 6;
/** The ISO weekdays a daily template can name, Monday first. */
export const EVERY_WEEKDAY: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

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

/** The lines on one period's section, in their stored order. */
export function entriesForPeriod(entries: GoalEntry[], periodKey: string): GoalEntry[] {
  return entries.filter((e) => e.periodKey === periodKey).sort(bySortOrder);
}

/** The id every device gives a template's line on a period, so two copies of it are one line. */
export function materializedEntryId(templateId: string, periodKey: string): string {
  return `${templateId}:${periodKey}`;
}

const CARRY_MARK = '>';

/**
 * The id every device gives the line that carries an entry over onto a period,
 * so two copies of it are one line. It is rooted at the first entry of the
 * chain: a carried line carried over again gets an id of the same length.
 */
export function carriedEntryId(sourceEntryId: string, periodKey: string): string {
  const [root] = sourceEntryId.split(CARRY_MARK);
  return `${root}${CARRY_MARK}${periodKey}`;
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
 * paper. A daily template is written only on the weekdays it names. A line
 * crossed off stays off. Idempotent; returns the same `goals` when nothing is
 * missing.
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
    if (!repeatsOn(t, periodKey)) continue;
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
  /** The ISO weekdays a repeating daily goal is written on; omit, or name them all, for every day. */
  weekdays?: readonly number[];
}

/**
 * Write a new line at the bottom of a period's section. A blank title writes
 * nothing. A repeating daily goal whose weekdays exclude this period only
 * gains its template; its first line waits for the next day it names.
 */
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
  const weekdays = fitWeekdays(cadence, input.weekdays);

  const template: GoalTemplate | undefined = input.repeats
    ? { id: newId(), cadence, title, targetCount, checkLabels, weekdays, sortOrder, updatedAt: now }
    : undefined;
  if (template && !repeatsOn(template, periodKey)) {
    return { ...goals, templates: [...goals.templates, template] };
  }
  const entry: GoalEntry = {
    id: template ? materializedEntryId(template.id, periodKey) : newId(),
    templateId: template?.id,
    cadence,
    periodKey,
    title,
    checks: emptyChecks(targetCount),
    checkLabels,
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

export interface GoalEditPatch {
  title?: string;
  targetCount?: number;
  /** Replaces the line's labels; omit to keep them, fitted to the new count. */
  checkLabels?: string[];
  /** Replaces the template's weekdays; omit to keep them. Lines already written are never moved. */
  weekdays?: readonly number[];
}

/**
 * Edit a line in place. Edits to a recurring goal also update its template so
 * future pages inherit the new title, check count, labels and weekdays. A
 * blank title keeps the old one; existing marks survive a resize and labels
 * follow it.
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
          t.id === entry.templateId
            ? {
                ...t,
                title,
                targetCount,
                checkLabels,
                weekdays: fitWeekdays(t.cadence, patch.weekdays ?? t.weekdays),
                updatedAt: now,
              }
            : t,
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
 * to this page nor appears on future ones. A template already retired keeps
 * the moment it was retired.
 */
export function removeGoal(goals: Goals, entryId: string, now: Stamp): Goals {
  const entry = goals.entries.find((e) => e.id === entryId);
  if (!entry) return goals;

  return {
    ...goals,
    entries: goals.entries.filter((e) => e.id !== entryId),
    tombstones: withTombstone(goals.tombstones, entryId, now),
    templates: entry.templateId
      ? goals.templates.map((t) =>
          t.id === entry.templateId && !t.retiredAt ? { ...t, retiredAt: now, updatedAt: now } : t,
        )
      : goals.templates,
  };
}

/**
 * Stop a recurring goal without crossing its line off: the template is
 * retired, so it writes no more lines, while the line keeps its place, its
 * checks and its `templateId`. The line is stamped, and a stamped line is
 * never a ghost, so no merge drops it.
 */
export function stopRepeating(goals: Goals, entryId: string, now: Stamp): Goals {
  const entry = goals.entries.find((e) => e.id === entryId);
  const template = goals.templates.find((t) => t.id === entry?.templateId);
  if (!entry || !template || template.retiredAt) return goals;

  return {
    ...goals,
    templates: goals.templates.map((t) =>
      t.id === template.id ? { ...t, retiredAt: now, updatedAt: now } : t,
    ),
    entries: goals.entries.map((e) => (e.id === entryId ? { ...e, updatedAt: now } : e)),
  };
}

/**
 * What the pad offers to write on a period's section: the unfinished one-off
 * lines of the most recent earlier period with any lines, in their stored
 * order. Only the period containing `today` gets suggestions. A line stops
 * being offered once it is carried over or declined, and while its title is
 * written on this period.
 */
export function suggestionsFor(
  goals: Pick<Goals, 'entries' | 'tombstones' | 'declinedSuggestions'>,
  cadence: Cadence,
  periodKey: string,
  today: DayKey,
): Suggestion[] {
  if (periodKeyFor(cadence, today) !== periodKey) return [];

  const sourcePeriodKey = latestPeriodBefore(goals.entries, cadence, periodKey);
  if (sourcePeriodKey === undefined) return [];

  const declined = new Set(goals.declinedSuggestions);
  const written = new Set<string>();
  for (const e of goals.entries) {
    if (e.periodKey === periodKey) written.add(titleKey(e.title));
  }

  return entriesForPeriod(goals.entries, sourcePeriodKey)
    .filter(
      (e) =>
        !e.templateId &&
        e.checks.some((check) => check !== 'done') &&
        !declined.has(e.id) &&
        !isCarriedOver(goals, e.id, periodKey) &&
        !written.has(titleKey(e.title)),
    )
    .map((e) => ({
      kind: 'carryover',
      sourceEntryId: e.id,
      sourcePeriodKey,
      cadence,
      title: e.title,
      targetCount: e.checks.length,
      checkLabels: e.checkLabels,
    }));
}

/** The note under a suggestion's title: "from yesterday", or the earlier period it comes from. */
export function suggestionNote(suggestion: Suggestion, today: DayKey): string {
  const { cadence, sourcePeriodKey } = suggestion;
  switch (cadence) {
    case 'daily':
      return sourcePeriodKey === addDays(today, -1)
        ? 'from yesterday'
        : `from ${formatDayWithWeekday(sourcePeriodKey)}`;
    case 'weekly':
      return sourcePeriodKey === weekKeyOf(addDays(today, -7))
        ? 'from last week'
        : 'from an earlier week';
    case 'annual':
      return sourcePeriodKey === String(Number(yearKeyOf(today)) - 1)
        ? 'from last year'
        : `from ${sourcePeriodKey}`;
  }
}

/**
 * Accept a suggestion: a fresh one-off line at the bottom of the period's
 * section with the source's title, check count and labels, its checks empty,
 * marked as carrying the source over. The source line is untouched. A
 * suggestion already carried over writes nothing.
 */
export function acceptSuggestion(
  goals: Goals,
  suggestion: Suggestion,
  periodKey: string,
  now: Stamp,
): Goals {
  const { sourceEntryId, cadence, title, targetCount, checkLabels } = suggestion;
  if (isCarriedOver(goals, sourceEntryId, periodKey)) return goals;

  const written = addGoal(
    goals,
    { cadence, periodKey, title, targetCount, checkLabels, repeats: false },
    now,
  );
  if (written === goals) return goals;
  const line = {
    ...written.entries[written.entries.length - 1],
    id: carriedEntryId(sourceEntryId, periodKey),
    carriedFrom: sourceEntryId,
  };
  return { ...written, entries: [...goals.entries, line] };
}

/** Decline a suggestion: its source line is never offered again, and is itself untouched. */
export function declineSuggestion(goals: Goals, sourceEntryId: string): Goals {
  const declined = goals.declinedSuggestions ?? [];
  if (declined.includes(sourceEntryId)) return goals;
  return { ...goals, declinedSuggestions: [...declined, sourceEntryId].sort() };
}

const byId: KeyOf<GoalTemplate | GoalEntry> = { key: (x) => x.id, stamp: (x) => x.updatedAt };

/**
 * Reconcile two copies of the goals, item by item (ADR 0005): templates and
 * entries each by id, the later write winning, crossed-off lines staying off.
 * A template retired on either copy stays retired from its first retirement,
 * whichever write is later (ADR 0008). A line a stale device wrote for a
 * template after it was retired is dropped. A suggestion declined on either
 * device stays declined.
 */
export function mergeGoals(local: Goals, remote: Goals): Goals {
  const retired = firstRetirements([...local.templates, ...remote.templates]);
  const templates = mergeKeyed(
    { items: local.templates, tombstones: {} },
    { items: remote.templates, tombstones: {} },
    byId,
  ).items.map((t) => {
    const retiredAt = retired.get(t.id);
    return retiredAt === t.retiredAt ? t : { ...t, retiredAt };
  });
  const entries = mergeKeyed(
    { items: local.entries, tombstones: local.tombstones },
    { items: remote.entries, tombstones: remote.tombstones },
    byId,
  );
  const declinedSuggestions = [
    ...new Set([...(local.declinedSuggestions ?? []), ...(remote.declinedSuggestions ?? [])]),
  ].sort();
  return {
    templates,
    entries: entries.items.filter((e) => !isGhost(e, retired)),
    tombstones: entries.tombstones,
    ...(declinedSuggestions.length > 0 ? { declinedSuggestions } : {}),
  };
}

/**
 * The pad as persisted before stamps, brought into shape: everything stamped
 * legacy (ahead of a fresh seed, behind any real write), seed templates and
 * materialized lines given the ids every device shares, retirements marked at
 * the epoch, and its stars retired.
 */
export function upgradeLegacyGoals(legacy: LegacyGoals): Goals {
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
    updatedAt: LEGACY,
    ...(active ? {} : { retiredAt: EPOCH }),
  }));
  const entries = legacy.entries.map((e) => {
    if (!e.templateId) return { ...e, updatedAt: LEGACY };
    const templateId = templateIds.get(e.templateId) ?? e.templateId;
    return {
      ...e,
      id: materializedEntryId(templateId, e.periodKey),
      templateId,
      updatedAt: LEGACY,
    };
  });
  return retireStars({ templates, entries, tombstones: {} });
}

/**
 * The pad as persisted while the star ranked a line first in its section:
 * each period's lines renumbered 1… in that order, starred first, so the
 * stored sortOrder alone keeps what was visible. Stamps are untouched.
 */
export function retireStars(goals: StarredGoals): Goals {
  const byPeriod = new Map<string, StarredGoalEntry[]>();
  for (const e of goals.entries) {
    byPeriod.set(e.periodKey, [...(byPeriod.get(e.periodKey) ?? []), e]);
  }
  const sortOrders = new Map<string, number>();
  for (const lines of byPeriod.values()) {
    lines.sort(byStarredOrder).forEach((e, i) => sortOrders.set(e.id, i + 1));
  }
  return {
    ...goals,
    entries: goals.entries.map(({ starred: _starred, ...e }) => ({
      ...e,
      sortOrder: sortOrders.get(e.id) ?? e.sortOrder,
    })),
  };
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

/** When each template was first retired, on any of the copies given. */
function firstRetirements(templates: GoalTemplate[]): Map<string, Stamp> {
  const first = new Map<string, Stamp>();
  for (const { id, retiredAt } of templates) {
    if (retiredAt === undefined) continue;
    const known = first.get(id);
    if (known === undefined || isEarlier(retiredAt, known)) first.set(id, retiredAt);
  }
  return first;
}

/** Whether stamp `a` is before `b`; the same moment written two ways orders by its text. */
function isEarlier(a: Stamp, b: Stamp): boolean {
  const gap = Date.parse(a) - Date.parse(b);
  return gap < 0 || (gap === 0 && a < b);
}

/**
 * Whether an entry is already carried over: some entry carries it, or its
 * carried line on this period exists or was crossed off.
 */
function isCarriedOver(
  goals: Pick<Goals, 'entries' | 'tombstones'>,
  sourceEntryId: string,
  periodKey: string,
): boolean {
  const carriedId = carriedEntryId(sourceEntryId, periodKey);
  return (
    carriedId in goals.tombstones ||
    goals.entries.some((e) => e.id === carriedId || e.carriedFrom === sourceEntryId)
  );
}

/** The latest period of a cadence before `periodKey` that has any line written on it. */
function latestPeriodBefore(
  entries: GoalEntry[],
  cadence: Cadence,
  periodKey: string,
): string | undefined {
  let latest: string | undefined;
  for (const e of entries) {
    if (e.cadence !== cadence || e.periodKey >= periodKey) continue;
    if (latest === undefined || e.periodKey > latest) latest = e.periodKey;
  }
  return latest;
}

/** Two titles are the same goal when they match ignoring case and surrounding space. */
function titleKey(title: string): string {
  return title.trim().toLowerCase();
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

/**
 * A daily template's weekdays, sorted and deduplicated, with anything outside
 * Mon–Sun dropped. Naming every day, or none, is the default and stores
 * nothing; so does any cadence other than daily.
 */
function fitWeekdays(
  cadence: Cadence,
  weekdays: readonly number[] | undefined,
): number[] | undefined {
  if (cadence !== 'daily' || !weekdays) return undefined;
  const fitted = EVERY_WEEKDAY.filter((day) => weekdays.includes(day));
  return fitted.length === 0 || fitted.length === EVERY_WEEKDAY.length ? undefined : fitted;
}

/** Whether a template writes a line on this period: a daily one only on the weekdays it names. */
function repeatsOn(template: GoalTemplate, periodKey: string): boolean {
  if (template.cadence !== 'daily' || !template.weekdays?.length) return true;
  return template.weekdays.includes(weekdayOf(periodKey));
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

function bySortOrder(a: GoalEntry, b: GoalEntry): number {
  return a.sortOrder - b.sortOrder;
}

/** How a section read while the star was drawn: starred lines first, then stored order. */
function byStarredOrder(a: StarredGoalEntry, b: StarredGoalEntry): number {
  if (Boolean(a.starred) !== Boolean(b.starred)) return a.starred ? -1 : 1;
  return bySortOrder(a, b);
}

function nextSortOrder(items: { sortOrder: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}
