import type { PadData } from '@/features/backup/types';
import { isUpcomingEvent } from '@/features/events/logic';
import type { UpcomingEvent } from '@/features/events/types';
import { isGoalEntry, isGoalTemplate } from '@/features/goals/logic';
import type { GoalEntry, GoalTemplate } from '@/features/goals/types';
import { isGratitudeEntries } from '@/features/gratitude/logic';
import type { GratitudeEntries } from '@/features/gratitude/types';
import { isArrayOf, isNumber, isRecord, parseJson, type Guard } from '@/lib/guards';
import { canonicalJson, isTombstones, type Stamp, type Tombstones } from '@/lib/merge';

import type { CloudFiles, CloudPad, SyncPhase } from './types';

/** Bump when the cloud layout changes; an older app leaves a newer file alone. */
export const CLOUD_SCHEMA_VERSION = 1;

const GOALS_INDEX = 'goals/index.json';
const GRATITUDE_INDEX = 'gratitude/index.json';
const EVENTS = 'events.json';
const YEAR_FILE = /^(goals|gratitude)\/entries-(\d{4})\.json$/;
const COPY = /^(.+)@\d+$/;

/**
 * The pad laid out as cloud files (ADR 0006): each feature's index holds what
 * is small and slow to change, and each year's entries sit in their own file,
 * so a check tap rewrites one year, never the whole history. The text is
 * canonical — items sorted by key, object keys sorted — so two devices holding
 * the same pad write the same bytes and see nothing to push.
 */
export function splitPad(pad: PadData): CloudFiles {
  const files: CloudFiles = {};
  const write = (path: string, body: Record<string, unknown>) => {
    files[path] = canonicalJson({ schemaVersion: CLOUD_SCHEMA_VERSION, ...body });
  };

  write(GOALS_INDEX, {
    templates: sortById(pad.goals.templates),
    tombstones: pad.goals.tombstones,
  });
  for (const [year, entries] of byYear(pad.goals.entries, (e) => e.periodKey)) {
    write(yearPath('goals', year), { entries: sortById(entries) });
  }
  write(GRATITUDE_INDEX, { tombstones: pad.gratitude.tombstones });
  for (const [year, mornings] of byYear(Object.values(pad.gratitude.entries), (e) => e.forDate)) {
    write(yearPath('gratitude', year), {
      entries: Object.fromEntries(mornings.map((m) => [m.forDate, m])),
    });
  }
  write(EVENTS, { events: sortById(pad.events.events), tombstones: pad.events.tombstones });
  return files;
}

/**
 * The pad the cloud files hold. A file that is missing holds nothing; one that
 * is damaged or from a newer app is unreadable — it contributes nothing and is
 * never overwritten. Paths outside the layout are left alone.
 */
export function joinPad(files: CloudFiles): CloudPad {
  const unreadable: string[] = [];
  const read = <T>(path: string, guard: Guard<T>): T | undefined => {
    const text = files[path];
    if (text === undefined) return undefined;
    const body = readFile(text, guard);
    if (body === undefined) unreadable.push(path);
    return body;
  };

  const goalsIndex = read(GOALS_INDEX, isGoalsIndex);
  const gratitudeIndex = read(GRATITUDE_INDEX, isGratitudeIndex);
  const events = read(EVENTS, isEventsFile);
  const entries: GoalEntry[] = [];
  const mornings: GratitudeEntries = {};
  for (const path of Object.keys(files).sort()) {
    const match = YEAR_FILE.exec(path);
    if (!match) continue;
    if (match[1] === 'goals') entries.push(...(read(path, isGoalsYear)?.entries ?? []));
    else Object.assign(mornings, read(path, isGratitudeYear)?.entries ?? {});
  }

  return {
    pad: {
      goals: {
        templates: goalsIndex?.templates ?? [],
        entries: sortById(entries),
        tombstones: goalsIndex?.tombstones ?? {},
      },
      gratitude: { entries: mornings, tombstones: gratitudeIndex?.tombstones ?? {} },
      events: { events: events?.events ?? [], tombstones: events?.tombstones ?? {} },
    },
    unreadable,
  };
}

/**
 * iCloud keeps every version of a file two devices wrote at once; the device
 * reads them all, the extra ones as `path@n`. Each copy is merged in like any
 * other device's pad, so it doesn't matter which version iCloud kept.
 */
export function separateCopies(files: CloudFiles): { current: CloudFiles; copies: CloudFiles[] } {
  const current: CloudFiles = {};
  const copies: CloudFiles[] = [];
  for (const [path, text] of Object.entries(files)) {
    const copy = COPY.exec(path);
    if (copy) copies.push({ [copy[1]]: text });
    else current[path] = text;
  }
  return { current, copies };
}

/** The paths whose text the cloud doesn't hold yet — never one it couldn't read. */
export function changedPaths(
  cloud: CloudFiles,
  next: CloudFiles,
  unreadable: readonly string[],
): string[] {
  return Object.keys(next)
    .filter((path) => next[path] !== cloud[path] && !unreadable.includes(path))
    .sort();
}

/** The Pad footer's line on where sync stands. */
export function describeSync(
  phase: SyncPhase,
  lastSyncedAt: Stamp | null,
  problem: string | null,
): string {
  switch (phase) {
    case 'starting':
      return 'Checking iCloud…';
    case 'syncing':
      return 'Syncing with iCloud…';
    case 'synced':
      return lastSyncedAt
        ? `Synced with iCloud at ${formatTime(lastSyncedAt)}`
        : 'Synced with iCloud';
    case 'unavailable':
      return 'Not synced. Sign in to iCloud to keep this pad on every device.';
    case 'error':
      return `Couldn’t sync with iCloud: ${problem ?? 'unknown problem'}`;
  }
}

interface GoalsIndex {
  templates: GoalTemplate[];
  tombstones: Tombstones;
}

interface GoalsYear {
  entries: GoalEntry[];
}

interface GratitudeIndex {
  tombstones: Tombstones;
}

interface GratitudeYear {
  entries: GratitudeEntries;
}

interface EventsFile {
  events: UpcomingEvent[];
  tombstones: Tombstones;
}

function isGoalsIndex(value: unknown): value is GoalsIndex {
  return (
    isRecord(value) && isArrayOf(isGoalTemplate)(value.templates) && isTombstones(value.tombstones)
  );
}

function isGoalsYear(value: unknown): value is GoalsYear {
  return isRecord(value) && isArrayOf(isGoalEntry)(value.entries);
}

function isGratitudeIndex(value: unknown): value is GratitudeIndex {
  return isRecord(value) && isTombstones(value.tombstones);
}

function isGratitudeYear(value: unknown): value is GratitudeYear {
  return isRecord(value) && isGratitudeEntries(value.entries);
}

function isEventsFile(value: unknown): value is EventsFile {
  return (
    isRecord(value) && isArrayOf(isUpcomingEvent)(value.events) && isTombstones(value.tombstones)
  );
}

function readFile<T>(text: string, guard: Guard<T>): T | undefined {
  const body = parseJson(text);
  if (!isRecord(body) || !isNumber(body.schemaVersion)) return undefined;
  if (body.schemaVersion > CLOUD_SCHEMA_VERSION) return undefined;
  return guard(body) ? body : undefined;
}

function yearPath(feature: 'goals' | 'gratitude', year: string): string {
  return `${feature}/entries-${year}.json`;
}

/** Items grouped by the year their day key starts with; period keys of every cadence start with one. */
function byYear<T>(items: T[], dayOf: (item: T) => string): Map<string, T[]> {
  const years = new Map<string, T[]>();
  for (const item of items) {
    const year = dayOf(item).slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), item]);
  }
  return years;
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function formatTime(stamp: Stamp): string {
  return new Date(stamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
