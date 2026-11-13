import { retireStars, upgradeLegacyGoals } from '@/features/goals/logic';
import {
  CADENCES,
  CHECK_STATES,
  type GoalEntry,
  type GoalTemplate,
  type Goals,
  type LegacyGoalEntry,
  type LegacyGoalTemplate,
  type LegacyGoals,
} from '@/features/goals/types';
import type { Gratitude, GratitudeEntries, GratitudeEntry } from '@/features/gratitude/types';
import type { DayKey } from '@/lib/dates';
import type { Tombstones } from '@/lib/merge';

import type { LegacyPadData, PadData, PadFile } from './types';

/** Bump when the file shape changes; an older app refuses a newer file. */
export const SCHEMA_VERSION = 5;
/** The last schema whose entries carry a star; 2 and 3 differ only by a template's optional weekdays. */
const LAST_STARRED_SCHEMA_VERSION = 3;
/** Every shape this app still reads. A file up to schema 4 also holds upcoming events, which are left unread. */
const READABLE_SCHEMA_VERSIONS = [1, 2, LAST_STARRED_SCHEMA_VERSION, 4, SCHEMA_VERSION];

/** What a readable pad file holds. */
export interface PadFileContents {
  pad: PadData;
  exportedAt: string;
}

export type ParsedPad = ({ ok: true } & PadFileContents) | { ok: false; reason: string };

const NOT_A_PAD_FILE = 'This isn’t a Daily Goals pad file.';
const NEWER_PAD_FILE =
  'This pad was exported by a newer version of Daily Goals. Update the app to import it.';

/** The whole pad as one readable JSON document, stamped with `now`. */
export function serializePad(pad: PadData, now: string): string {
  const file: PadFile = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    goals: pad.goals,
    gratitude: pad.gratitude,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Read a pad file back. Anything that isn't a pad file, was written by a newer
 * app, or has a part in the wrong shape is refused with a reason to show. A
 * schema 1 file predates stamps; its items are stamped legacy, behind any real
 * write.
 */
export function parsePad(text: string): ParsedPad {
  const file = parseJson(text);
  if (!isRecord(file) || !isNumber(file.schemaVersion)) return refuse(NOT_A_PAD_FILE);
  if (file.schemaVersion > SCHEMA_VERSION) return refuse(NEWER_PAD_FILE);
  if (!READABLE_SCHEMA_VERSIONS.includes(file.schemaVersion)) return refuse(NOT_A_PAD_FILE);
  if (!isTimestamp(file.exportedAt)) return refuse(damaged('export date'));

  const pad = file.schemaVersion === 1 ? readLegacyPad(file) : readPad(file, file.schemaVersion);
  if (typeof pad === 'string') return refuse(pad);
  return { ok: true, exportedAt: file.exportedAt, pad };
}

/** `daily-goals-2026-08-27.json` */
export function padFileName(day: DayKey): string {
  return `daily-goals-${day}.json`;
}

/** "2 templates, 42 entries and 12 gratitude entries" — what an import brings. */
export function describePad(pad: PadData): string {
  const parts = [
    count(pad.goals.templates.length, 'template'),
    count(pad.goals.entries.length, 'entry', 'entries'),
    count(Object.keys(pad.gratitude.entries).length, 'gratitude entry', 'gratitude entries'),
  ];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The pad's two parts, or the reason the first damaged one is refused. */
function readPad(file: Record<string, unknown>, schemaVersion: number): PadData | string {
  if (!isGoals(file.goals)) return damaged('goals');
  if (!isGratitude(file.gratitude)) return damaged('gratitude entries');
  const goals = schemaVersion <= LAST_STARRED_SCHEMA_VERSION ? retireStars(file.goals) : file.goals;
  return { goals, gratitude: file.gratitude };
}

function readLegacyPad(file: Record<string, unknown>): PadData | string {
  if (!isLegacyGoals(file.goals)) return damaged('goals');
  if (!isGratitudeEntries(file.gratitude)) return damaged('gratitude entries');
  const legacy: LegacyPadData = { goals: file.goals, gratitude: file.gratitude };
  return {
    goals: upgradeLegacyGoals(legacy.goals),
    gratitude: { entries: legacy.gratitude, tombstones: {} },
  };
}

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function refuse(reason: string): ParsedPad {
  return { ok: false, reason };
}

function damaged(part: string): string {
  return `This pad file is damaged: its ${part} aren’t in the expected shape.`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

type Guard<T> = (value: unknown) => value is T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isTimestamp(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function isArrayOf<T>(guard: Guard<T>): Guard<T[]> {
  return (value): value is T[] => Array.isArray(value) && value.every(guard);
}

function isOptional<T>(guard: Guard<T>): Guard<T | undefined> {
  return (value): value is T | undefined => value === undefined || guard(value);
}

function isOneOf<T extends string>(values: readonly T[]): Guard<T> {
  return (value): value is T => values.includes(value as T);
}

const isCadence = isOneOf(CADENCES);
const isCheckState = isOneOf(CHECK_STATES);
const isOptionalString = isOptional(isString);
const isOptionalStrings = isOptional(isArrayOf(isString));
const isOptionalBoolean = isOptional(isBoolean);
const isOptionalTimestamp = isOptional(isTimestamp);

function isWeekday(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7;
}

const isOptionalWeekdays = isOptional(isArrayOf(isWeekday));

function isTombstones(value: unknown): value is Tombstones {
  return isRecord(value) && Object.values(value).every(isTimestamp);
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

function isGoalTemplate(value: unknown): value is GoalTemplate {
  return (
    isRecord(value) &&
    hasTemplateFields(value) &&
    isOptionalWeekdays(value.weekdays) &&
    isOptionalTimestamp(value.retiredAt) &&
    isTimestamp(value.updatedAt)
  );
}

function isLegacyGoalTemplate(value: unknown): value is LegacyGoalTemplate {
  return isRecord(value) && hasTemplateFields(value) && isBoolean(value.active);
}

/** The fields an entry has had in every schema, and the star a file up to schema 3 draws on it. */
function hasEntryFields(value: Record<string, unknown>): boolean {
  return (
    isString(value.id) &&
    isOptionalString(value.templateId) &&
    isCadence(value.cadence) &&
    isString(value.periodKey) &&
    isString(value.title) &&
    isArrayOf(isCheckState)(value.checks) &&
    isOptionalStrings(value.checkLabels) &&
    isOptionalBoolean(value.starred) &&
    isNumber(value.sortOrder)
  );
}

function isGoalEntry(value: unknown): value is GoalEntry {
  return isRecord(value) && hasEntryFields(value) && isTimestamp(value.updatedAt);
}

function isLegacyGoalEntry(value: unknown): value is LegacyGoalEntry {
  return isRecord(value) && hasEntryFields(value);
}

function isGoals(value: unknown): value is Goals {
  return (
    isRecord(value) &&
    isArrayOf(isGoalTemplate)(value.templates) &&
    isArrayOf(isGoalEntry)(value.entries) &&
    isTombstones(value.tombstones)
  );
}

function isLegacyGoals(value: unknown): value is LegacyGoals {
  return (
    isRecord(value) &&
    isArrayOf(isLegacyGoalTemplate)(value.templates) &&
    isArrayOf(isLegacyGoalEntry)(value.entries)
  );
}

function isGratitudeEntry(value: unknown): value is GratitudeEntry {
  return (
    isRecord(value) &&
    isString(value.forDate) &&
    isTimestamp(value.writtenAt) &&
    isString(value.text)
  );
}

/** Entries are keyed by reflection date, so every key must match its entry's `forDate`. */
function isGratitudeEntries(value: unknown): value is GratitudeEntries {
  return (
    isRecord(value) &&
    Object.entries(value).every(([day, entry]) => isGratitudeEntry(entry) && entry.forDate === day)
  );
}

function isGratitude(value: unknown): value is Gratitude {
  return isRecord(value) && isGratitudeEntries(value.entries) && isTombstones(value.tombstones);
}
