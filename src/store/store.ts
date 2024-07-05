import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import {
  Days,
  GoalCategory,
  GoalCreateArgs,
  GoalDeleteArgs,
  GoalStatus,
  GoalUpdateArgs,
} from '../types';

export const useStore = defineStore('days', {
  state: () => ({
    data: useStorage<Days>('data', {}, localStorage, {
      deep: true,
      listenToStorageChanges: true,
      mergeDefaults: true,
    }),
    currentDayId: '',
  }),
  getters: {
    getCurrentGoalsByCategory(state) {
      return (category: GoalCategory) =>
        state.data[state.currentDayId].data[category];
    },
    getCurrentDayId(state) {
      return state.currentDayId;
    },
  },
  actions: {
    createGoal(goalArgs: GoalCreateArgs) {
      const newGoal = {
        id: uuidv4(),
        ...goalArgs,
        status: GoalStatus.Active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      this.data[this.currentDayId].data[goalArgs.category].push(newGoal);
      this.data[this.currentDayId].updatedAt = new Date().toISOString();
    },
    updateGoal(goalArgs: GoalUpdateArgs) {
      const goals = [
        ...this.data[this.currentDayId].data[goalArgs.previousCategory],
      ];

      const goalIndex = goals.findIndex((item) => item.id === goalArgs.id);
      if (goalIndex === -1) return;
      const goal = goals[goalIndex];

      const { previousCategory, newCategory, ...args } = goalArgs;

      const updatedGoal = {
        ...args,
        category: newCategory,
        status: goal.status,
        createdAt: goal.createdAt,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      if (previousCategory === newCategory) {
        goals.splice(goalIndex, 1, updatedGoal);
        this.data[this.currentDayId].data[goalArgs.previousCategory] = goals;
        this.data[this.currentDayId].updatedAt = new Date().toISOString();
        return;
      }

      goals.splice(goalIndex, 1);
      const newCategoryGoals = [
        ...this.data[this.currentDayId].data[goalArgs.newCategory],
      ];
      newCategoryGoals.push(updatedGoal);
      this.data[this.currentDayId].data[goalArgs.previousCategory] = goals;
      this.data[this.currentDayId].data[goalArgs.newCategory] =
        newCategoryGoals;
      this.data[this.currentDayId].updatedAt = new Date().toISOString();
    },
    deleteGoal(goalArgs: GoalDeleteArgs) {
      const goals = [...this.data[this.currentDayId].data[goalArgs.category]];

      const goalIndex = goals.findIndex((item) => item.id === goalArgs.id);
      if (goalIndex === -1) return;
      const goal = goals[goalIndex];

      const deletedGoal = {
        ...goal,
        deletedAt: new Date().toISOString(),
      };

      goals.splice(goalIndex, 1, deletedGoal);
      this.data[this.currentDayId].data[goalArgs.category] = goals;
      this.data[this.currentDayId].updatedAt = new Date().toISOString();
    },
    createDay() {
      const id = uuidv4();
      this.data[id] = {
        id,
        data: {
          daily: [],
          weekly: [],
          annual: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.setDayId(id);
    },
    setDayId(id: string) {
      this.currentDayId = id;
    },
    initializeStore() {
      if (!!this.currentDayId) return;

      const dayIds = Object.keys(this.data);

      if (!dayIds.length) {
        this.createDay();
        return;
      }
      this.setDayId(dayIds[dayIds.length - 1]);
    },
  },
});
