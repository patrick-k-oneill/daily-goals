import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useToday } from '@/lib/clock';
import { todayKey, type DayKey } from '@/lib/dates';
import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';
import type { Goals } from './types';

interface GoalsState extends Goals {
  /** Write today's page: every active template's line on its current period. */
  materializeToday: (today: DayKey) => void;
  addGoal: (input: logic.AddGoalInput) => void;
  cycleCheck: (entryId: string, checkIndex: number) => void;
  toggleStar: (entryId: string) => void;
  updateGoal: (entryId: string, patch: logic.GoalEditPatch) => void;
  removeGoal: (entryId: string) => void;
  /** Replace every template and entry with an imported pad's; it lands with today written. */
  replaceGoals: (goals: Goals) => void;
}

/**
 * The goals feature's React binding: every action is one pure transition from
 * ./logic applied to the persisted state. Today's page is always written —
 * on first run, on rehydration and on import — so a section only reads.
 */
export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      ...logic.materializeToday(logic.seedGoals(), todayKey()),

      materializeToday: (today) => set((goals) => logic.materializeToday(goals, today)),
      addGoal: (input) => set((goals) => logic.addGoal(goals, input)),
      cycleCheck: (entryId, checkIndex) =>
        set((goals) => logic.cycleCheck(goals, entryId, checkIndex)),
      toggleStar: (entryId) => set((goals) => logic.toggleStar(goals, entryId)),
      updateGoal: (entryId, patch) => set((goals) => logic.updateGoal(goals, entryId, patch)),
      removeGoal: (entryId) => set((goals) => logic.removeGoal(goals, entryId)),
      replaceGoals: (goals) => set(logic.materializeToday(goals, todayKey())),
    }),
    persistOptions<GoalsState>('goals', {
      version: 2,
      // v1 persisted a `seeded` flag alongside the data; the seed is now the initial state.
      migrate: (persisted) => {
        const { seeded: _seeded, ...goals } = persisted as Goals & { seeded?: boolean };
        return goals as GoalsState;
      },
      // The saved pad may be from an earlier day; today is written before the first render.
      merge: (persisted, current) => ({
        ...current,
        ...logic.materializeToday((persisted as Goals | undefined) ?? current, todayKey()),
      }),
    }),
  ),
);

/** Keep today's page written as the clock turns: midnight and each return to the foreground. */
export function useMaterializeToday() {
  const today = useToday();
  const materializeToday = useGoalsStore((s) => s.materializeToday);

  useEffect(() => {
    // Before hydration the store holds only the seed; rehydration writes today itself.
    if (useGoalsStore.persist.hasHydrated()) materializeToday(today);
  }, [today, materializeToday]);
}
