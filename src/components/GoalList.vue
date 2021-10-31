<template>
    
    <div v-if="goals.length">
        <h2>Goals</h2>
        <ul>
            <li v-for="goal in goals">
                <GoalSingle :key="goal.createdAt" :goal="goal" />
            </li>
        </ul>
    </div>

</template>

<script setup lang="ts">
    import GoalSingle from '@/components/GoalSingle.vue'
    import { Goal } from '@/types';

    defineProps<{ goals: Goal[] }>()
</script>

<style>
</style>