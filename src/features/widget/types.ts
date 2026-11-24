/** One goal line as the widget draws it: its title and how many of its checks are done. */
export interface WidgetLine {
  id: string;
  title: string;
  done: number;
  total: number;
}

/** The colors the widget draws with. It runs outside the app and cannot read the theme. */
export interface WidgetColors {
  paper: string;
  ink: string;
  faded: string;
  accent: string;
}

/** What the Today's goals widget shows from one moment on. */
export interface TodaySnapshot {
  /** The day shown, "Fri, Aug 21"; absent once the snapshot has run out of days it can vouch for. */
  dateLabel?: string;
  lines: WidgetLine[];
  /** How many more lines the day holds than the widget has room for. */
  more: number;
  colors: { light: WidgetColors; dark: WidgetColors };
  /** Where a tap on the widget goes. */
  url: string;
}

/** A snapshot and the moment the widget starts showing it. */
export interface SnapshotEntry {
  date: Date;
  props: TodaySnapshot;
}
