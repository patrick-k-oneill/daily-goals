<template>
  <div class="GoalsPage">
    <br />
    <h1>Daily Goals</h1>
    <GoalList :category="GoalCategory.Daily" />
    <br />
    <h1>Weekly Goals</h1>
    <GoalList :category="GoalCategory.Weekly" />
    <br />
    <h1>Annual Goals</h1>
    <GoalList :category="GoalCategory.Annual" />
    <br />
  </div>
</template>

<script setup lang="ts">
import GoalList from '../components/GoalList.vue';
import { useStore } from '../store/store';
import { GoalCategory } from '../types';

const { initializeStore } = useStore();
initializeStore();

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
