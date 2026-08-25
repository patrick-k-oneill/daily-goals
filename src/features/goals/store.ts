import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { newId } from '@/lib/id';
import { todayKey } from '@/lib/dates';
import { persistOptions } from '@/lib/persisted-store';

import {
  applyGoalEdit,
  cycleState,
  emptyChecks,
  isCurrentPeriod,
  missingEntries,
  nextSortOrder,
} from './logic';
import type { Cadence, GoalEntry, GoalTemplate } from './types';

interface AddGoalInput {
  cadence: Cadence;
  periodKey: string;
  title: string;
  targetCount: number;
  /** Also create a template so the goal reappears every new period. */
  repeats: boolean;
  starred?: boolean;
}

interface GoalsState {
  seeded: boolean;
  templates: GoalTemplate[];
  entries: GoalEntry[];
  /** Seed defaults on first run, then materialize recurring goals for a period. */
  ensurePeriod: (cadence: Cadence, periodKey: string) => void;
  addGoal: (input: AddGoalInput) => void;
  cycleCheck: (entryId: string, checkIndex: number) => void;
  toggleStar: (entryId: string) => void;
  updateGoal: (entryId: string, patch: { title?: string; targetCount?: number }) => void;
  removeGoal: (entryId: string, opts?: { stopRepeating?: boolean }) => void;
}

/** The recurring goals from the legal pad, as first-run defaults. */
function seedTemplates(): GoalTemplate[] {
  const createdAt = todayKey();
  const seed = (
    cadence: Cadence,
    title: string,
    targetCount: number,
    sortOrder: number,
    checkLabels?: string[],
  ): GoalTemplate => ({
    id: newId(),
    cadence,
    title,
    targetCount,
    checkLabels,
    active: true,
    sortOrder,
    createdAt,
  });

  return [
    seed('daily', 'Recurring Dailies', 1, 1),
    seed('daily', 'Daily Prod', 8, 2),
    seed('weekly', 'Recurring Dailies', 7, 1),
    seed('weekly', 'Fitness', 7, 2, ['Legs', 'Push', 'Pull', 'Legs', 'Push', 'Pull', 'Core']),
    seed('weekly', 'Weekly Prod', 6, 3),
  ];
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      seeded: false,
      templates: [],
      entries: [],

      ensurePeriod: (cadence, periodKey) =>
        set((state) => {
          const templates = state.seeded ? state.templates : seedTemplates();
          // Templates only materialize into the current period: a past page
          // renders exactly what was written on it, like paper.
          const additions = isCurrentPeriod(cadence, periodKey, todayKey())
            ? missingEntries(templates, state.entries, cadence, periodKey)
            : [];
          if (state.seeded && additions.length === 0) return state;
          return { seeded: true, templates, entries: [...state.entries, ...additions] };
        }),

      addGoal: ({ cadence, periodKey, title, targetCount, repeats, starred }) =>
        set((state) => {
          const trimmed = title.trim();
          if (!trimmed) return state;

          const sortOrder = nextSortOrder([
            ...state.entries.filter((e) => e.periodKey === periodKey),
            ...state.templates.filter((t) => t.cadence === cadence),
          ]);

          const template: GoalTemplate | undefined = repeats
            ? {
                id: newId(),
                cadence,
                title: trimmed,
                targetCount,
                active: true,
                sortOrder,
                createdAt: todayKey(),
              }
            : undefined;

          const entry: GoalEntry = {
            id: newId(),
            templateId: template?.id,
            cadence,
            periodKey,
            title: trimmed,
            checks: emptyChecks(targetCount),
            starred: starred ?? false,
            sortOrder,
          };

          return {
            templates: template ? [...state.templates, template] : state.templates,
            entries: [...state.entries, entry],
          };
        }),

      cycleCheck: (entryId, checkIndex) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  checks: e.checks.map((c, i) => (i === checkIndex ? cycleState(c) : c)),
                }
              : e,
          ),
        })),

      toggleStar: (entryId) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.id === entryId ? { ...e, starred: !e.starred } : e)),
        })),

      updateGoal: (entryId, patch) =>
        set((state) => applyGoalEdit(state.entries, state.templates, entryId, patch)),

      removeGoal: (entryId, opts) =>
        set((state) => {
          const entry = state.entries.find((e) => e.id === entryId);
          if (!entry) return state;
          const stopRepeating = opts?.stopRepeating && entry.templateId;
          return {
            entries: state.entries.filter((e) => e.id !== entryId),
            templates: stopRepeating
              ? state.templates.map((t) =>
                  t.id === entry.templateId ? { ...t, active: false } : t,
                )
              : state.templates,
          };
        }),
    }),
    persistOptions('goals'),
  ),
);
