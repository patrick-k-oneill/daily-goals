import type { DayKey } from '@/lib/dates';

/** Where a feedback note was written, for the footer of its issue. */
export interface FeedbackContext {
  platform: string;
  /** Absent on web, which reports no OS version. */
  osVersion?: string;
  appVersion: string;
  day: DayKey;
}

/** A feedback note as it is written: a one-line title and the detail under it. */
export interface FeedbackDraft {
  title: string;
  description: string;
}

/** A feedback note shaped as a GitHub issue. */
export interface FeedbackIssue {
  title: string;
  body: string;
  labels: string[];
}

/** How a send ended, with the line Settings shows. */
export interface SendOutcome {
  ok: boolean;
  message: string;
}
