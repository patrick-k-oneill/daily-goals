export type Cadence = 'daily' | 'weekly' | 'annual';

/**
 * A single checkbox on the pad: blank, checked off, or crossed out (missed).
 * Tapping cycles empty → done → missed → empty.
 */
export type CheckState = 'empty' | 'done' | 'missed';

/** A recurring goal that materializes into an entry each new period. */
export interface GoalTemplate {
  id: string;
  cadence: Cadence;
  title: string;
  /** Number of checkboxes per period (e.g. "Daily Prod" gets 8 per day). */
  targetCount: number;
  /** Optional per-check labels, like Fitness's Legs/Push/Pull. */
  checkLabels?: string[];
  active: boolean;
  sortOrder: number;
  createdAt: string;
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
  checkLabels?: string[];
  /** The star drawn in the pad margin next to the day's key item. */
  starred: boolean;
  sortOrder: number;
}
