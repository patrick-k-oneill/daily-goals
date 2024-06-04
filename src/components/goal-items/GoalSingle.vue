<template>
  <div>
    {{ goal.name }} &mdash; {{ goal.status }}
    <br />
    {{ goal.category }}
    <br />
    <button @click="editClicked">Edit</button>
    <button @click="deleteClicked" :disabled="!!goal.deletedAt">Delete</button>
  </div>
</template>

<script setup lang="ts">
import { Goal } from '../../types';

const props = defineProps<{ goal: Goal }>();

const emit = defineEmits<{
  (e: 'edit-clicked', id: string): void;
  (e: 'delete-clicked', id: string): void;
}>();

const editClicked = () => {
  emit('edit-clicked', props.goal.id);
};

const deleteClicked = () => {
  emit('delete-clicked', props.goal.id);
};

// type: primary = square checkbox input
// type: incremental =  Multiple inline circle checkboxes w/ :last-child === square checkbox
// type: secondary = circle checkbox input,
// extra left margin,
// --below: display:block,
// --right: display:inline-block
</script>
