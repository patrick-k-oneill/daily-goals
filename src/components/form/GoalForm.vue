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

    <button @click="props.onSave(toRaw(form))">{{ props.saveText }}</button>
    <br />
    <button @click="props.onCancel">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import { reactive, toRaw } from '@vue/reactivity';
import { GoalCategory, GoalForm } from '../../types';

const props = defineProps<{
  form: GoalForm;
  saveText: string;
  onSave: (form: GoalForm) => void;
  onCancel: () => void;
}>();

const categories = Object.values(GoalCategory);

const form = reactive<GoalForm>(props.form);
</script>

<style scoped>
.Form {
  display: flex;
  flex-direction: column;
  text-align: left;
}
</style>
