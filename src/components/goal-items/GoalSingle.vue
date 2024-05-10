<template>
  <div>
    {{ goal.name }} &mdash; {{ goal.status }}
    <br />
    {{ goal.category }}
    <br />
    <button @click="openEdit">Edit</button>
    <button @click="delete">Delete</button>
  </div>
</template>

<script setup lang="ts">
import { Goal } from '@/types'

const props = defineProps<{ goal: Goal }>()

const emit = defineEmits<{
  (e: 'openEdit', value: string): void
  (e: 'delete', value: Goal): void
}>()

const openEdit = () => {
  emit('openEdit', props.goal.id)
}

// type: primary = square checkbox input
// type: incremental =  Multiple inline circle checkboxes w/ :last-child === square checkbox
// type: secondary = circle checkbox input,
// extra left margin,
// --below: display:block,
// --right: display:inline-block
</script>
