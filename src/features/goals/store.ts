import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { todayKey } from '@/lib/dates';
import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';
import type { Cadence, Goals } from './types';

interface GoalsState extends Goals {
  /** Materialize recurring goals onto a period's section (current period only). */
  ensurePeriod: (cadence: Cadence, periodKey: string) => void;
  addGoal: (input: logic.AddGoalInput) => void;
  cycleCheck: (entryId: string, checkIndex: number) => void;
  toggleStar: (entryId: string) => void;
  updateGoal: (entryId: string, patch: logic.GoalEditPatch) => void;
  removeGoal: (entryId: string) => void;
}

/**
 * The goals feature's React binding: every action is one pure transition from
 * ./logic applied to the persisted state. First run starts from the seeded
 * pad; anything saved to storage replaces the seed on rehydration.
 */
export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      ...logic.seedGoals(),

      ensurePeriod: (cadence, periodKey) =>
        set((goals) => logic.ensurePeriod(goals, cadence, periodKey, todayKey())),
      addGoal: (input) => set((goals) => logic.addGoal(goals, input)),
      cycleCheck: (entryId, checkIndex) =>
        set((goals) => logic.cycleCheck(goals, entryId, checkIndex)),
      toggleStar: (entryId) => set((goals) => logic.toggleStar(goals, entryId)),
      updateGoal: (entryId, patch) => set((goals) => logic.updateGoal(goals, entryId, patch)),
      removeGoal: (entryId) => set((goals) => logic.removeGoal(goals, entryId)),
    }),
    persistOptions<GoalsState>('goals', {
      version: 2,
      // v1 persisted a `seeded` flag alongside the data; the seed is now the initial state.
      migrate: (persisted) => {
        const { seeded: _seeded, ...goals } = persisted as Goals & { seeded?: boolean };
        return goals as GoalsState;
      },
    }),
  ),
);
