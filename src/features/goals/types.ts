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
  sortOrder: number;
  /** When the goal was crossed off for good; a retired template writes no more lines. */
  retiredAt?: Stamp;
  updatedAt: Stamp;
}

/** A goal line on a specific period's page — recurring instance or one-off. */
export interface GoalEntry {
  /** A materialized line is `<templateId>:<periodKey>`, so every device writes the same id. */
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
  /** The star drawn in the pad margin next to the day's key item. */
  starred: boolean;
  sortOrder: number;
  /** The epoch until someone writes on the line. */
  updatedAt: Stamp;
}

/** Everything ever written in the goal sections: the templates, every period's entries, and the lines crossed off. */
export interface Goals {
  templates: GoalTemplate[];
  entries: GoalEntry[];
  /** Entries crossed off the page, by id. */
  tombstones: Tombstones;
}

/** The shape before stamps (store v2, pad file v1): `active` instead of `retiredAt`, random ids everywhere, no tombstones. */
export interface LegacyGoals {
  templates: LegacyGoalTemplate[];
  entries: LegacyGoalEntry[];
}

export type LegacyGoalTemplate = Omit<GoalTemplate, 'updatedAt' | 'retiredAt'> & {
  active: boolean;
};

export type LegacyGoalEntry = Omit<GoalEntry, 'updatedAt'>;
