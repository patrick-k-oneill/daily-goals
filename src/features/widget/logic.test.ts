import { Colors } from '@/constants/theme';
import type { GoalEntry, GoalTemplate, Goals } from '@/features/goals/types';
import { EPOCH } from '@/lib/merge';

import {
  daySnapshot,
  isWidgetLink,
  snapshotTimeline,
  WIDGET_DAYS_AHEAD,
  WIDGET_LINES,
  WIDGET_URL,
} from './logic';

// Fri 8/21/26; the 22nd is a Saturday.
const TODAY = '2026-08-21';
const NOW = new Date(2026, 7, 21, 9, 30);

function template(overrides: Partial<GoalTemplate> = {}): GoalTemplate {
  return {
    id: 't1',
    cadence: 'daily',
    title: 'Deep Work',
    targetCount: 3,
    sortOrder: 1,
    updatedAt: EPOCH,
    ...overrides,
  };
}

function line(overrides: Partial<GoalEntry> = {}): GoalEntry {
  return {
    id: 'e1',
    cadence: 'daily',
    periodKey: TODAY,
    title: 'Call the bank',
    checks: ['empty'],
    sortOrder: 2,
    updatedAt: EPOCH,
    ...overrides,
  };
}

function goals(overrides: Partial<Goals> = {}): Goals {
  return { templates: [], entries: [], tombstones: {}, ...overrides };
}

describe('daySnapshot', () => {
  it("shows the day's daily lines in their order, each with its checks done and in all", () => {
    const pad = goals({
      entries: [
        line(),
        line({
          id: 't1:2026-08-21',
          templateId: 't1',
          title: 'Deep Work',
          checks: ['done', 'missed', 'done'],
          sortOrder: 1,
        }),
        line({ id: 'w', cadence: 'weekly', periodKey: '2026-W34', title: 'Fitness' }),
        line({ id: 'y', periodKey: '2026-08-20', title: 'Yesterday' }),
      ],
    });

    expect(daySnapshot(pad, TODAY)).toMatchObject({
      dateLabel: 'Fri, Aug 21',
      lines: [
        { id: 't1:2026-08-21', title: 'Deep Work', done: 2, total: 3 },
        { id: 'e1', title: 'Call the bank', done: 0, total: 1 },
      ],
      more: 0,
    });
  });

  it('keeps to the lines it has room for and counts the rest', () => {
    const entries = Array.from({ length: WIDGET_LINES + 2 }, (_, i) =>
      line({ id: `e${i}`, title: `Goal ${i}`, sortOrder: i }),
    );
    const snapshot = daySnapshot(goals({ entries }), TODAY);
    expect(snapshot.lines.map((l) => l.title)).toEqual(['Goal 0', 'Goal 1', 'Goal 2', 'Goal 3']);
    expect(snapshot.more).toBe(2);
  });

  it('shows a day with nothing on it as a dated, empty page', () => {
    expect(daySnapshot(goals(), TODAY)).toMatchObject({
      dateLabel: 'Fri, Aug 21',
      lines: [],
      more: 0,
    });
  });

  it('shows a day not written yet as the pad will write it, weekdays kept', () => {
    const pad = goals({
      templates: [
        template(),
        template({ id: 't2', title: 'Weekday only', weekdays: [1, 2, 3, 4, 5], sortOrder: 2 }),
        template({ id: 't3', title: 'Stopped', retiredAt: EPOCH, sortOrder: 3 }),
      ],
    });

    expect(daySnapshot(pad, '2026-08-22').lines).toEqual([
      { id: 't1:2026-08-22', title: 'Deep Work', done: 0, total: 3 },
    ]);
    expect(daySnapshot(pad, '2026-08-24').lines.map((l) => l.title)).toEqual([
      'Deep Work',
      'Weekday only',
    ]);
  });

  it('carries the paper palette of both schemes, since the widget cannot read the theme', () => {
    expect(daySnapshot(goals(), TODAY).colors).toEqual({
      light: {
        paper: Colors.light.background,
        ink: Colors.light.text,
        faded: Colors.light.textSecondary,
        accent: Colors.light.accent,
      },
      dark: {
        paper: Colors.dark.background,
        ink: Colors.dark.text,
        faded: Colors.dark.textSecondary,
        accent: Colors.dark.accent,
      },
    });
  });
});

describe('isWidgetLink', () => {
  it("knows the widget's own link from any other the app is opened with", () => {
    expect(daySnapshot(goals(), TODAY).url).toBe(WIDGET_URL);
    expect(isWidgetLink(WIDGET_URL)).toBe(true);
    expect(isWidgetLink('dailygoals://')).toBe(false);
    expect(isWidgetLink('dailygoals://settings')).toBe(false);
  });
});

describe('snapshotTimeline', () => {
  it('turns the page at each midnight for a week, then asks for the app', () => {
    const pad = goals({ templates: [template()], entries: [line()] });
    const timeline = snapshotTimeline(pad, TODAY, NOW);

    expect(timeline).toHaveLength(WIDGET_DAYS_AHEAD + 2);
    expect(timeline[0].date).toBe(NOW);
    expect(timeline[0].props.lines.map((l) => l.title)).toEqual(['Deep Work', 'Call the bank']);

    expect(timeline[1].date).toEqual(new Date(2026, 7, 22));
    expect(timeline[1].props).toMatchObject({
      dateLabel: 'Sat, Aug 22',
      lines: [{ id: 't1:2026-08-22', title: 'Deep Work', done: 0, total: 3 }],
    });
    expect(timeline[WIDGET_DAYS_AHEAD].props.dateLabel).toBe('Fri, Aug 28');

    const last = timeline[WIDGET_DAYS_AHEAD + 1];
    expect(last.date).toEqual(new Date(2026, 7, 29));
    expect(last.props.dateLabel).toBeUndefined();
    expect(last.props.lines).toEqual([]);
  });
});
