<template>

    <div class="GoalsPage">

        <button :disabled="showCreateGoalForm" @click="showCreateGoalForm = true">
            Create Goal
        </button>

        <CreateGoalForm 
            v-show="showCreateGoalForm" 
            @done="showCreateGoalForm = false"
            @create="createGoal"
        />

        <GoalList :goals="goals"
            @update="updateGoal"
            @delete="deleteGoal" />

    </div>

</template>

<script setup lang="ts">
    import { ref } from 'vue'
    import { Goal } from '@/types/index'
    import { createGoal, updateGoal, deleteGoal } from '@/utils/goal-helpers'
    import { useStorage } from '@vueuse/core'

    import GoalList from '@/components/GoalList.vue'
    import CreateGoalForm from '@/components/CreateGoalForm.vue'

    const showCreateGoalForm = ref(false)
    const goals = useStorage<Goal[]>('goals', [])
</script>

<style>
.GoalsPage {
    display: flex;
    flex-direction: column;
    /* display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-auto-columns: repeat(3, 1fr);
    text-align: left; */
}
</style>