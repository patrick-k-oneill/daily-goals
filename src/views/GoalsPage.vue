<template>
  <div class="GoalsPage">
    <br />
    <h1>Daily Goals</h1>
    <GoalList
      :goals="data[currentDayId].data.daily"
      :category="GoalCategory.Daily"
      @create-goal="handleGoalCreated"
      @update-goal="handleGoalUpdated"
      @delete-goal="handleGoalDeleted"
    />
    <br />
    <h1>Weekly Goals</h1>
    <GoalList
      :goals="data[currentDayId].data.weekly"
      :category="GoalCategory.Weekly"
      @create-goal="handleGoalCreated"
      @update-goal="handleGoalUpdated"
      @delete-goal="handleGoalDeleted"
    />
    <br />
    <h1>Annual Goals</h1>
    <GoalList
      :goals="data[currentDayId].data.annual"
      :category="GoalCategory.Annual"
      @create-goal="handleGoalCreated"
      @update-goal="handleGoalUpdated"
      @delete-goal="handleGoalDeleted"
    />
    <br />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import GoalList from '../components/GoalList.vue';
import {
  Days,
  Goal,
  GoalCategory,
  GoalCreateArgs,
  GoalUpdateArgs,
} from '../types';
import { createGoal, deleteGoal, updateGoal } from '../utils/goal-helpers';

const data = useStorage<Days>('data', {});
const currentDayId = Object.keys(data.value)[0];
const goals = useStorage<Goal[]>('goals', []);

// TODO: Initialize store and import CRUD methods
const handleGoalCreated = (args: GoalCreateArgs) => createGoal(args, goals);
const handleGoalUpdated = (args: GoalUpdateArgs) => updateGoal(args, goals);
const handleGoalDeleted = (id: string) => deleteGoal(id, goals);
</script>

<style>
.GoalsPage {
  display: flex;
  flex-direction: column;
  /* display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-columns: repeat(3, 1fr);
    text-align: left; */
}
</style>
