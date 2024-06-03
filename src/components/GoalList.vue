<template>
  <div v-if="goals.length">
    <h2>Goals</h2>
    <ul>
      <li v-for="goal in goals">
        <EditGoalForm
          v-if="editingGoalId === goal.id"
          :key="`${goal.id}-edit`"
          :goal="goal"
          @update="handleGoalUpdated"
          @close-edit="setEditingGoalId('')"
        />
        <GoalSingle
          v-else
          :key="goal.id"
          :goal="goal"
          :class="{ deleted: goal.deletedAt }"
          @edit="setEditingGoalId(goal.id)"
          @delete="handleGoalDeleted(goal.id)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GoalSingle from '../components/goal-items/GoalSingle.vue';
import { Goal, GoalUpdateArgs } from '../types';
import { deleteGoal, updateGoal } from '../utils/goal-helpers';
import EditGoalForm from './EditGoalForm.vue';

defineProps<{ goals: Goal[] }>();

const emit = defineEmits<{
  (e: 'done'): void;
}>();

const editingGoalId = ref('');
const setEditingGoalId = (id: string) => {
  editingGoalId.value = id;
};

const handleGoalUpdated = (args: GoalUpdateArgs) => {
  updateGoal(args);
  setEditingGoalId('');
};

const handleGoalDeleted = (id: string) => {
  deleteGoal(id);
  setEditingGoalId('');
};
</script>

<style>
.deleted {
  text-decoration: line-through;
  color: lightgrey;
}
</style>
