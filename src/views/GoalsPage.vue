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

        <GoalList :goals="goals" />

    </div>

</template>

<script setup lang="ts">
    import { ref } from 'vue'
    import { Goal, GoalCreateArgs, GoalStatus } from '@/types/index'
    import { useStorage } from '@vueuse/core'

    import GoalList from '@/components/GoalList.vue'
    import CreateGoalForm from '@/components/CreateGoalForm.vue'

    const showCreateGoalForm = ref(false)
    const goals = useStorage<Goal[]>('goals', [])

    const createGoal = (args: GoalCreateArgs) => {
        const date = new Date();
        const now = date.toISOString()

        const newGoal = {
            id: 'generate-unique-id', 
            ...args,
            status: GoalStatus.Active,
            createdAt: now,
            updatedAt: now,
            deletedAt: null
        }
        goals.value.push(newGoal)
    }
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