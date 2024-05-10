<template>
  <div v-if="goals.length">
    <h2>Goals</h2>
    <ul>
      <li v-for="goal in goals">
        <GoalSingle
          v-if="editingGoalId !== goal.id"
          :key="goal.id"
          :goal="goal"
          @update="updateGoal"
          @delete="deleteGoal"
        />
        <EditGoalForm v-else :key="`${goal.id}-edit`" :goal="goal" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { Goal, GoalUpdateArgs } from "@/types";
import { ref } from "vue";
import EditGoalForm from "./EditGoalForm.vue";
import GoalSingle from "@/components/goal-items/GoalSingle.vue";

const emit = defineEmits<{
  (e: "done"): void;
  (e: "update", value: GoalUpdateArgs): void;
}>();

const editingGoalId = ref("");

defineProps<{ goals: Goal[] }>();
</script>

<style></style>
