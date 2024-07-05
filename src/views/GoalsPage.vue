<template>
  <div class="GoalsPage">
    <GoalList v-for="category in GoalCategory" :category="category" />
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
