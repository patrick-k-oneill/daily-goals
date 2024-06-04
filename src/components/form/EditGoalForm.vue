<template>
  <GoalForm
    :form="form"
    save-text="Update"
    :on-save="update"
    :on-cancel="cancel"
  />
</template>

<script setup lang="ts">
import { Goal, GoalForm as GoalFormType, GoalUpdateArgs } from '../../types';
import GoalForm from './GoalForm.vue';

const props = defineProps<{ goal: Goal }>();

const emit = defineEmits<{
  (e: 'close-edit'): void;
  (e: 'update', args: GoalUpdateArgs): void;
}>();

const form = {
  name: props.goal.name,
  description: props.goal.description,
  category: props.goal.category,
};

const update = (form: GoalFormType) => {
  const { id } = props.goal;
  emit('update', { id, ...form });
  emit('close-edit');
};

const cancel = () => {
  emit('close-edit');
};
</script>
