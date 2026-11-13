import type { Stamp, Tombstones } from '@/lib/merge';

export const CADENCES = ['daily', 'weekly', 'annual'] as const;
export type Cadence = (typeof CADENCES)[number];

/**
 * A single checkbox on the pad: blank, checked off, or crossed out (missed).
 * Tapping cycles empty → done → missed → empty.
 */
export const CHECK_STATES = ['empty', 'done', 'missed'] as const;
export type CheckState = (typeof CHECK_STATES)[number];

/** A recurring goal that materializes into an entry each new period. */
export interface GoalTemplate {
  /** Seed templates share one id on every device (`seed:<cadence>:<sortOrder>`). */
  id: string;
  cadence: Cadence;
  title: string;
  /** Number of checkboxes per period (e.g. "Daily Prod" gets 8 per day). */
  targetCount: number;
  /** One label per check by position, like Fitness's Legs/Push/Pull; absent when none is written. */
  checkLabels?: string[];
  /**
   * The ISO weekdays (Mon = 1 … Sun = 7) a daily template is written on; absent
   * means every day. Weekly and annual templates carry none.
   */
  weekdays?: number[];
  sortOrder: number;
  /** When the goal was crossed off for good; a retired template writes no more lines. */
  retiredAt?: Stamp;
  updatedAt: Stamp;
}

/** A goal line on a specific period's page — recurring instance or one-off. */
export interface GoalEntry {
  /**
   * A materialized line is `<templateId>:<periodKey>` and a carried-over line
   * `<first entry's id>><periodKey>`, so every device writes the same id.
   */
  id: string;
  /** Present when this entry was materialized from a recurring template. */
  templateId?: string;
  cadence: Cadence;
  /** `2026-08-21` (daily) | `2026-W34` (weekly) | `2026` (annual). */
  periodKey: string;
  title: string;
  checks: CheckState[];
  /** One label per check by position; absent when none is written. */
  checkLabels?: string[];
  /** The line's place in its period's section, ascending; a new line takes the highest. */
  sortOrder: number;
  /** The entry this line carries over, when it was written by accepting a suggestion. */
  carriedFrom?: string;
  /** The epoch until someone writes on the line. */
  updatedAt: Stamp;
}

/** Everything ever written in the goal sections: the templates, every period's entries, and the lines crossed off. */
export interface Goals {
  templates: GoalTemplate[];
  entries: GoalEntry[];
  /** Entries crossed off the page, by id. */
  tombstones: Tombstones;
  /** The entries whose carryover suggestion was declined, by id, sorted; absent when none was. */
  declinedSuggestions?: string[];
}

/**
 * A goal the pad offers to write on the current period's section. It is on no
 * page until it is accepted.
 */
export interface Suggestion {
  /** Carryover: an unfinished one-off line from the most recent earlier period. */
  kind: 'carryover';
  /** The entry it would carry over. */
  sourceEntryId: string;
  /** The period the source entry is written on. */
  sourcePeriodKey: string;
  cadence: Cadence;
  title: string;
  targetCount: number;
  checkLabels?: string[];
}

/** How a section reads: open, settling after the check tap that completed it, or achieved. */
export type SectionStatus = 'open' | 'settling' | 'achieved';

/** What this device remembers of its reward moments. It is in no pad file and is never merged. */
export interface Rewards {
  /** Sections a check tap has just completed, by period key, each with the moment of that tap. */
  settling: Record<string, Stamp>;
  /** The last period each cadence's reward moment played on. */
  played: Partial<Record<Cadence, string>>;
}

/**
 * What settling a section came to: `waiting` when its tap has not rested yet,
 * `lapsed` when it is no longer complete, `achieved` when it settled without a
 * reward moment, `rewarded` when the reward moment plays.
 */
export type SettleOutcome = 'waiting' | 'lapsed' | 'achieved' | 'rewarded';

/** An entry as stored while the star was drawn (store v3, pad file 2–3): `starred` ranked it first in its section. */
export type StarredGoalEntry = GoalEntry & { starred?: boolean };

/** The shape before the star was retired (store v3, pad file 2–3). */
export interface StarredGoals extends Goals {
  entries: StarredGoalEntry[];
}

/** The shape before stamps (store v2, pad file v1): `active` instead of `retiredAt`, random ids everywhere, no tombstones. */
export interface LegacyGoals {
  templates: LegacyGoalTemplate[];
  entries: LegacyGoalEntry[];
}

export type LegacyGoalTemplate = Omit<GoalTemplate, 'updatedAt' | 'retiredAt'> & {
  active: boolean;
};

export type LegacyGoalEntry = Omit<StarredGoalEntry, 'updatedAt'>;
