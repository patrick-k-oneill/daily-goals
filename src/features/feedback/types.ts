import type { DayKey } from '@/lib/dates';

/** Where a feedback note was written, for the footer of its issue. */
export interface FeedbackContext {
  platform: string;
  /** Absent on web, which reports no OS version. */
  osVersion?: string;
  appVersion: string;
  day: DayKey;
}

/** A feedback note shaped as a GitHub issue. */
export interface FeedbackIssue {
  title: string;
  body: string;
  labels: string[];
}

/** How a send ended, with the line the pad footer shows. */
export interface SendOutcome {
  ok: boolean;
  message: string;
}
