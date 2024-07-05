<template>
  <ul>
    <li v-for="goal in getCurrentGoalsByCategory(category)">
      <EditGoalForm
        v-if="editingGoalId === goal.id"
        :key="`${goal.id}-edit`"
        :goal="goal"
        @update="updateGoal"
        @close-edit="setEditingGoalId('')"
      />
      <GoalSingle
        v-else
        :key="goal.id"
        :goal="goal"
        :class="{ deleted: goal.deletedAt }"
        @edit-clicked="setEditingGoalId(goal.id)"
        @delete-clicked="deleteGoal({ id: goal.id, category })"
      />
    </li>
    <li v-if="showCreateGoalForm">
      <CreateGoalForm
        @create="createGoal"
        @close-create="showCreateGoalForm = false"
      />
    </li>
    <button
      v-else
      :disabled="showCreateGoalForm"
      @click="showCreateGoalForm = true"
    >
      Create Goal
    </button>
  </ul>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GoalSingle from '../components/goal-items/GoalSingle.vue';
import { useStore } from '../store/store';
import { GoalCategory } from '../types';
import CreateGoalForm from './form/CreateGoalForm.vue';
import EditGoalForm from './form/EditGoalForm.vue';

defineProps<{ category: GoalCategory }>();

const { getCurrentGoalsByCategory, createGoal, updateGoal, deleteGoal } =
  useStore();

const showCreateGoalForm = ref(false);

const editingGoalId = ref('');
const setEditingGoalId = (id: string) => {
  editingGoalId.value = id;
};
</script>

<style>
.deleted {
  text-decoration: line-through;
  color: lightgrey;
}
</style>
