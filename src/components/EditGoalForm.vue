<template>
  <div class="Form">
    <label for="Name">
      Name<br />
      <input type="text" v-model="form.name" />
    </label>

    <label for="Description">
      Description<br />
      <input type="text" v-model="form.description" />
    </label>

    <div>
      <label :for="`category-${category}`" v-for="category in categories">
        <input
          :value="category"
          type="radio"
          name="category"
          :id="`category-${category}`"
          v-model="form.category"
        />
        {{ category }}
      </label>
    </div>

    <button @click="update">Update</button>
    <br />
    <button @click="cancel">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import { reactive, toRaw } from '@vue/reactivity';
import { Goal, GoalCategory, GoalForm, GoalUpdateArgs } from '../types';

const props = defineProps<{ goal: Goal }>();

const emit = defineEmits<{
  (e: 'close-edit'): void;
  (e: 'update', args: GoalUpdateArgs): void;
}>();

const categories = Object.values(GoalCategory);

const defaultFormValues = {
  name: props.goal.name,
  description: props.goal.description,
  category: props.goal.category,
};

const form = reactive<GoalForm>({ ...defaultFormValues });

const resetFormValues = () => {
  Object.assign(form, defaultFormValues);
};

const update = () => {
  const { id } = props.goal;
  emit('update', { id, ...toRaw(form) });
  emit('close-edit');
};

const cancel = () => {
  emit('close-edit');
  resetFormValues();
};
</script>

<style scoped>
.Form {
  display: flex;
  flex-direction: column;
  text-align: left;
}
</style>
