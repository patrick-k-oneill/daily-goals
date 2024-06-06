<template>
  <div class="GoalsPage">
    <button @click="migrate">Migrate</button>
    <br />
    <h1>Daily Goals</h1>
    <GoalList
      :goals="goals"
      :category="GoalCategory.Daily"
      @create-goal="handleGoalCreated"
      @update-goal="handleGoalUpdated"
      @delete-goal="handleGoalDeleted"
    />
    <br />
    <h1>Weekly Goals</h1>
    <GoalList
      :goals="goals"
      :category="GoalCategory.Weekly"
      @create-goal="handleGoalCreated"
      @update-goal="handleGoalUpdated"
      @delete-goal="handleGoalDeleted"
    />
    <br />
    <h1>Annual Goals</h1>
    <GoalList
      :goals="goals"
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
import { v4 as uuidv4 } from 'uuid';
import GoalList from '../components/GoalList.vue';
import { Days, Goal, GoalCategory, GoalCreateArgs, GoalUpdateArgs } from '../types';
import { createGoal, deleteGoal, updateGoal } from '../utils/goal-helpers';

const goals = useStorage<Goal[]>('goals', []);
const data = useStorage<Days>('data', {});

const migrate = () => {
  goals.value = [...goals.value].map((g) => ({...g, category: g.category.toLowerCase() as GoalCategory}))

  const id = uuidv4();
  data.value = {
    [id]: {
      id,
      data: {
        [GoalCategory.Daily]: goals.value.filter((g) => g.category === GoalCategory.Daily),
        [GoalCategory.Weekly]: goals.value.filter((g) => g.category === GoalCategory.Weekly),
        [GoalCategory.Annual]: goals.value.filter((g) => g.category === GoalCategory.Annual),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
  console.log('MIGRATED', {
    goals: goals.value,
    data: data.value
  })
}

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
