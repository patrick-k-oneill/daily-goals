import { Colors } from '@/constants/theme';
import { ensurePeriod, entriesForPeriod } from '@/features/goals/logic';
import type { Goals } from '@/features/goals/types';
import { addDays, formatDayLong, parseDayKey, type DayKey } from '@/lib/dates';

import type { SnapshotEntry, TodaySnapshot, WidgetColors } from './types';

/** The lines a small widget has room for under its date. */
export const WIDGET_LINES = 4;
/** How many days past today the widget can show without the app being opened. */
export const WIDGET_DAYS_AHEAD = 7;

/** The link a tap on the widget opens: the app, on today's page. */
export const WIDGET_URL = 'dailygoals://?from=widget';

const colors = { light: widgetColors('light'), dark: widgetColors('dark') };

/** Whether a link the app was opened with came from the widget. */
export function isWidgetLink(url: string): boolean {
  return url.startsWith(WIDGET_URL);
}

/**
 * A day's Daily section as the widget shows it: the lines written on it, or,
 * for a day whose page is not written yet, the lines the pad will write there
 * from its recurring goals.
 */
export function daySnapshot(goals: Goals, day: DayKey): TodaySnapshot {
  const lines = entriesForPeriod(ensurePeriod(goals, 'daily', day, day).entries, day).filter(
    (e) => e.cadence === 'daily',
  );
  return {
    dateLabel: formatDayLong(day),
    lines: lines.slice(0, WIDGET_LINES).map((e) => ({
      id: e.id,
      title: e.title,
      done: e.checks.filter((check) => check === 'done').length,
      total: e.checks.length,
    })),
    more: Math.max(0, lines.length - WIDGET_LINES),
    colors,
    url: WIDGET_URL,
  };
}

/**
 * What the widget shows from `now` on, with nobody opening the app: today,
 * then each coming day from its midnight, then, past the last day it can
 * vouch for, a snapshot with no date that asks for the app to be opened.
 * iOS turns the page on the widget by this timeline alone.
 */
export function snapshotTimeline(goals: Goals, today: DayKey, now: Date): SnapshotEntry[] {
  const days = Array.from({ length: WIDGET_DAYS_AHEAD }, (_, i) => addDays(today, i + 1));
  return [
    { date: now, props: daySnapshot(goals, today) },
    ...days.map((day) => ({ date: parseDayKey(day), props: daySnapshot(goals, day) })),
    {
      date: parseDayKey(addDays(today, WIDGET_DAYS_AHEAD + 1)),
      props: { lines: [], more: 0, colors, url: WIDGET_URL },
    },
  ];
}

function widgetColors(scheme: keyof typeof Colors): WidgetColors {
  const theme = Colors[scheme];
  return {
    paper: theme.background,
    ink: theme.text,
    faded: theme.textSecondary,
    accent: theme.accent,
  };
}
