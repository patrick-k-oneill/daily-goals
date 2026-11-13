import { isGoals, isLegacyGoals, retireStars, upgradeLegacyGoals } from '@/features/goals/logic';
import { isGratitude, isGratitudeEntries } from '@/features/gratitude/logic';
import type { DayKey } from '@/lib/dates';
import { isNumber, isRecord, isTimestamp, parseJson } from '@/lib/guards';

import type { LegacyPadData, PadData, PadFile } from './types';

/** Bump when the file shape changes; an older app refuses a newer file. */
export const SCHEMA_VERSION = 5;
/** The last schema whose entries carry a star; 2 and 3 differ only by a template's optional weekdays. */
const LAST_STARRED_SCHEMA_VERSION = 3;
/**
 * Every shape this app still reads. A file up to schema 4 also holds upcoming
 * events, which are left unread; 5 adds an entry's optional `carriedFrom` and
 * the goals' optional `declinedSuggestions`.
 */
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
