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
import { GoalCategory } from '../types';

const emit = defineEmits<{
  (e: 'done'): void;
  (e: 'update', value: GoalCreateForm): void;
}>();

const categories = Object.values(GoalCategory);

type GoalCreateForm = {
  name: string;
  description: string;
  category: GoalCategory;
};

const defaultFormValues = {
  name: '',
  description: '',
  category: GoalCategory.Daily,
};

const form = reactive<GoalCreateForm>({ ...defaultFormValues });

const resetFormValues = () => {
  Object.assign(form, defaultFormValues);
};

const create = () => {
  emit('update', toRaw(form));
  resetFormValues();
};

const cancel = () => {
  emit('done');
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
