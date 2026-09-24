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
  id: string;
  cadence: Cadence;
  title: string;
  /** Number of checkboxes per period (e.g. "Daily Prod" gets 8 per day). */
  targetCount: number;
  /** One label per check by position, like Fitness's Legs/Push/Pull; absent when none is written. */
  checkLabels?: string[];
  active: boolean;
  sortOrder: number;
}

/** A goal line on a specific period's page — recurring instance or one-off. */
export interface GoalEntry {
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
}

/** Everything ever written in the goal sections: the templates and every period's entries. */
export interface Goals {
  templates: GoalTemplate[];
  entries: GoalEntry[];
}
