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
      <li v-if="showCreateGoalForm">
        <CreateGoalForm
          @create="handleGoalCreated"
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GoalSingle from '../components/goal-items/GoalSingle.vue';
import { Goal, GoalForm, GoalUpdateArgs } from '../types';
import CreateGoalForm from './CreateGoalForm.vue';
import EditGoalForm from './EditGoalForm.vue';

defineProps<{ goals: Goal[] }>();

const emit = defineEmits<{
  (e: 'create-goal', value: GoalForm): void;
  (e: 'update-goal', args: GoalUpdateArgs): void;
  (e: 'delete-goal', id: string): void;
}>();

const showCreateGoalForm = ref(false);

const editingGoalId = ref('');
const setEditingGoalId = (id: string) => {
  editingGoalId.value = id;
};

const handleGoalCreated = (value: GoalForm) => {
  emit('create-goal', value);
};

const handleGoalUpdated = (args: GoalUpdateArgs) => {
  emit('update-goal', args);
};

const handleGoalDeleted = (id: string) => {
  emit('delete-goal', id);
};
</script>

<style>
.deleted {
  text-decoration: line-through;
  color: lightgrey;
}
</style>
