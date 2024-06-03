<template>
  <div class="GoalsPage">
    <button :disabled="showCreateGoalForm" @click="showCreateGoalForm = true">
      Create Goal
    </button>

    <CreateGoalForm
      v-show="showCreateGoalForm"
      @done="showCreateGoalForm = false"
      @create="handleGoalCreated"
    />

    <GoalList
      :goals="goals"
      @update-goal="handleGoalUpdated"
      @delete-goal="handleGoalDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { ref } from 'vue';
import CreateGoalForm from '../components/CreateGoalForm.vue';
import GoalList from '../components/GoalList.vue';
import { Goal, GoalCreateArgs, GoalUpdateArgs } from '../types';
import { createGoal, deleteGoal, updateGoal } from '../utils/goal-helpers';

// TODO: Get rid of this, consolidate Create/Update forms and render them in place
const showCreateGoalForm = ref(false);
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
