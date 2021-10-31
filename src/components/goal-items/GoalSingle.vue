<template>
    <div>
        {{ goal.name }} &mdash; {{ goal.status }}
        <br>
        {{ goal.category }}
    </div>
</template>

<script setup lang="ts">
import { Goal } from '@/types';

defineProps<{ goal: Goal }>()

// type: primary = square checkbox input
// type: incremental =  Multiple inline circle checkboxes w/ :last-child === square checkbox 
// type: secondary = circle checkbox input,
        // extra left margin,
        // --below: display:block,
        // --right: display:inline-block
</script>