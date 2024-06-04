<template>
  <GoalForm
    :form="form"
    save-text="Create"
    :on-save="create"
    :on-cancel="cancel"
  />
</template>

<script setup lang="ts">
import {
  GoalCategory,
  GoalCreateArgs,
  GoalForm as GoalFormType,
} from '../../types';
import GoalForm from './GoalForm.vue';

const emit = defineEmits<{
  (e: 'close-create'): void;
  (e: 'create', args: GoalCreateArgs): void;
}>();

const form = {
  name: '',
  description: '',
  category: GoalCategory.Daily,
};

const create = (form: GoalFormType) => {
  emit('create', form);
  emit('close-create');
};

const cancel = () => {
  emit('close-create');
};
</script>
