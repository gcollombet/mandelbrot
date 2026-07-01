<script setup lang="ts">
interface NavItem { id: string; icon: string; title?: string }
defineProps<{ items: NavItem[]; active?: string }>();
const emit = defineEmits<{ (e: 'select', id: string): void }>();
</script>

<template>
  <nav class="mobile-nav">
    <button
      v-for="it in items"
      :key="it.id"
      class="mn-btn"
      :class="{ active: it.id === active }"
      :title="it.title"
      @click="emit('select', it.id)"
    >
      <svg viewBox="0 0 24 24" v-html="it.icon"></svg>
    </button>
  </nav>
</template>
