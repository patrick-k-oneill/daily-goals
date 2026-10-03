import {
  isLegacyUpcomingEvents,
  isUpcomingEvents,
  upgradeLegacyEvents,
} from '@/features/events/logic';
import { isGoals, isLegacyGoals, upgradeLegacyGoals } from '@/features/goals/logic';
import { isGratitude, isGratitudeEntries } from '@/features/gratitude/logic';
import type { DayKey } from '@/lib/dates';
import { isNumber, isRecord, isTimestamp, parseJson } from '@/lib/guards';
import type { Stamp } from '@/lib/merge';

import type { LegacyPadData, PadData, PadFile } from './types';

/** Bump when the file shape changes; an older app refuses a newer file. */
export const SCHEMA_VERSION = 2;

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
    events: pad.events,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Read a pad file back. Anything that isn't a pad file, was written by a newer
 * app, or has a part in the wrong shape is refused with a reason to show. A
 * schema 1 file predates stamps; its items are stamped `now`, the moment this
 * device first knew them.
 */
export function parsePad(text: string, now: Stamp): ParsedPad {
  const file = parseJson(text);
  if (!isRecord(file) || !isNumber(file.schemaVersion)) return refuse(NOT_A_PAD_FILE);
  if (file.schemaVersion > SCHEMA_VERSION) return refuse(NEWER_PAD_FILE);
  if (file.schemaVersion !== 1 && file.schemaVersion !== SCHEMA_VERSION) {
    return refuse(NOT_A_PAD_FILE);
  }
  if (!isTimestamp(file.exportedAt)) return refuse(damaged('export date'));

  const pad = file.schemaVersion === 1 ? readLegacyPad(file, now) : readPad(file);
  if (typeof pad === 'string') return refuse(pad);
  return { ok: true, exportedAt: file.exportedAt, pad };
}

/** `daily-goals-2026-08-27.json` */
export function padFileName(day: DayKey): string {
  return `daily-goals-${day}.json`;
}

/** "2 templates, 42 entries, 12 gratitude entries and 3 upcoming events" — what an import brings. */
export function describePad(pad: PadData): string {
  const parts = [
    count(pad.goals.templates.length, 'template'),
    count(pad.goals.entries.length, 'entry', 'entries'),
    count(Object.keys(pad.gratitude.entries).length, 'gratitude entry', 'gratitude entries'),
    count(pad.events.events.length, 'upcoming event'),
  ];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The pad's three parts, or the reason the first damaged one is refused. */
function readPad(file: Record<string, unknown>): PadData | string {
  if (!isGoals(file.goals)) return damaged('goals');
  if (!isGratitude(file.gratitude)) return damaged('gratitude entries');
  if (!isUpcomingEvents(file.events)) return damaged('upcoming events');
  return { goals: file.goals, gratitude: file.gratitude, events: file.events };
}

function readLegacyPad(file: Record<string, unknown>, now: Stamp): PadData | string {
  if (!isLegacyGoals(file.goals)) return damaged('goals');
  if (!isGratitudeEntries(file.gratitude)) return damaged('gratitude entries');
  if (!isLegacyUpcomingEvents(file.events)) return damaged('upcoming events');
  const legacy: LegacyPadData = {
    goals: file.goals,
    gratitude: file.gratitude,
    events: file.events,
  };
  return {
    goals: upgradeLegacyGoals(legacy.goals, now),
    gratitude: { entries: legacy.gratitude, tombstones: {} },
    events: upgradeLegacyEvents(legacy.events, now),
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
