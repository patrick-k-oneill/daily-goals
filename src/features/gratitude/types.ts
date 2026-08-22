/**
 * The morning ritual: each day's gratitude is written the next morning onto
 * the previous day's page. `forDate` is the day being reflected on.
 */
export interface GratitudeEntry {
  /** Day key of the day being appreciated — yesterday, at writing time. */
  forDate: string;
  /** ISO timestamp of the last edit. */
  writtenAt: string;
  text: string;
}
