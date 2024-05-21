<template>
  <div v-if="goals.length">
    <h2>Goals</h2>
    <ul>
      <li v-for="goal in goals">
        <GoalSingle
          v-if="editingGoalId !== goal.id"
          :key="goal.id"
          :goal="goal"
          @edit="setEditingGoalId(goal.id)"
          @delete="deleteGoal(goal.id)"
        />
        <EditGoalForm v-else :key="`${goal.id}-edit`" :goal="goal" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import GoalSingle from '@/components/goal-items/GoalSingle.vue';
import { Goal, GoalUpdateArgs } from '@/types';
import { ref } from 'vue';
import { deleteGoal } from '../utils/goal-helpers';
import EditGoalForm from './EditGoalForm.vue';

const emit = defineEmits<{
  (e: 'done'): void;
  (e: 'update', value: GoalUpdateArgs): void;
}>();

const editingGoalId = ref('');
const setEditingGoalId = (id: string) => {
  editingGoalId.value = id;
};

const deleteGoalId = (id: string) => {
  deleteGoal(id);
  setEditingGoalId('');
};

defineProps<{ goals: Goal[] }>();
</script>

<style></style>
