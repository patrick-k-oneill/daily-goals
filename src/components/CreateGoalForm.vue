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

    <button @click="create">Create</button>
    <br />
    <button @click="cancel">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import { reactive, toRaw } from '@vue/reactivity';
import { GoalCategory, GoalForm } from '../types';

const emit = defineEmits<{
  (e: 'close-create'): void;
  (e: 'create', value: GoalForm): void;
}>();

const categories = Object.values(GoalCategory);

const defaultFormValues = {
  name: '',
  description: '',
  category: GoalCategory.Daily,
};

const form = reactive<GoalForm>({ ...defaultFormValues });

const resetFormValues = () => {
  Object.assign(form, defaultFormValues);
};

const create = () => {
  emit('create', toRaw(form));
  emit('close-create');
  resetFormValues();
};

const cancel = () => {
  emit('close-create');
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
