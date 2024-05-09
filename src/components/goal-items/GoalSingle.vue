<template>
    <div>
        {{ goal.name }} &mdash; {{ goal.status }}
        <br>
        {{ goal.category }}
        <br>
        <button @click="update">
            Update
        </button>
        <button @click="delete">
            Delete
        </button>
    </div>
</template>

<script setup lang="ts">
import { Goal, GoalUpdateArgs } from '@/types';
import { toRaw } from '@vue/reactivity';

defineProps<{ goal: Goal }>()

const emit = defineEmits<{
    (e: 'update', value: GoalUpdateArgs): void,
    (e: 'delete', value: Goal): void,
}>()

const update = () => {
    emit('update', toRaw(form))
    resetFormValues()
}

// type: primary = square checkbox input
// type: incremental =  Multiple inline circle checkboxes w/ :last-child === square checkbox 
// type: secondary = circle checkbox input,
        // extra left margin,
        // --below: display:block,
        // --right: display:inline-block
</script>