<template>
  <div class="GoalsPage">
    <GoalList
      :goals="goals"
      @create-goal="handleGoalCreated"
      @update-goal="handleGoalUpdated"
      @delete-goal="handleGoalDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import GoalList from '../components/GoalList.vue';
import { Goal, GoalCreateArgs, GoalUpdateArgs } from '../types';
import { createGoal, deleteGoal, updateGoal } from '../utils/goal-helpers';

const goals = useStorage<Goal[]>('goals', []);
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
