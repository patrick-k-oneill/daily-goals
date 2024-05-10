<template>
  <div class="GoalsPage">
    <button :disabled="showCreateGoalForm" @click="showCreateGoalForm = true">
      Create Goal
    </button>

    <CreateGoalForm
      v-show="showCreateGoalForm"
      @done="showCreateGoalForm = false"
      @create="createGoal"
    />

    <GoalList :goals="goals" />
  </div>
</template>

<script setup lang="ts">
import { Goal } from '@/types/index';
import { createGoal } from '@/utils/goal-helpers';
import { useStorage } from '@vueuse/core';
import { ref } from 'vue';

import CreateGoalForm from '@/components/CreateGoalForm.vue';
import GoalList from '@/components/GoalList.vue';

const showCreateGoalForm = ref(false);
const goals = useStorage<Goal[]>('goals', []);
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
