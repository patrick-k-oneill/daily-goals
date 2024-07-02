import { RemovableRef } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import { Days, Goal, GoalCreateArgs, GoalStatus, GoalUpdateArgs } from '../types';

// TODO: replace all with pinia store.ts
export const createGoal = async (
  args: GoalCreateArgs,
  goalsRef: RemovableRef<Goal[]>,
) => {
  try {
    const newGoal = {
      id: uuidv4(),
      ...args,
      status: GoalStatus.Active,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    goalsRef.value.push(newGoal);
  } catch (error) {
    throw error;
  }
};

/**
 * Until DB CRUD flows are established: import
 * goals array from local storage, splice
 * in goal with updated args
 */
export const updateGoal = async (
  args: GoalUpdateArgs,
  goalsRef: RemovableRef<Goal[]>,
) => {
  try {
    const { value: goals } = goalsRef;

    const goalIndex = goals.findIndex((item: Goal) => item.id === args.id);
    if (goalIndex === -1) return;
    const goal: Goal = goals[goalIndex];

    const updatedGoal = {
      ...args,
      status: goal.status,
      createdAt: goal.createdAt,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    goals.splice(goalIndex, 1, updatedGoal);
    goalsRef.value = goals;
  } catch (error) {
    throw error;
  }
};

/**
 * Until DB CRUD flows are established: define
 * goal's 'deletedAt' prop, splice back
 * into array. Used to style
 * deleted goal
 */
export const deleteGoal = async (
  id: string,
  goalsRef: RemovableRef<Goal[]>,
) => {
  try {
    const { value: goals } = goalsRef;

    const goalIndex = goals.findIndex((item: Goal) => item.id === id);
    if (goalIndex === -1) return;
    const goal: Goal = goals[goalIndex];

    const deletedGoal: Goal = Object.assign({}, goal);
    deletedGoal.deletedAt = new Date().toISOString();

    goals.splice(goalIndex, 1, deletedGoal);
    goalsRef.value = goals;
  } catch (error) {
    throw error;
  }
};

export const createDay = async (
  daysRef: RemovableRef<Days>,
) => {
  try {
    const id = uuidv4();
    daysRef.value[id] = {
      id,
      data: {
        daily: [],
        weekly: [],
        annual: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    throw error;
  }
};
