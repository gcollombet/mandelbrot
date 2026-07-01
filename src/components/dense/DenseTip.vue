<script setup lang="ts">
import { computed } from 'vue';
import { tipState } from './denseTip';

// Position near the cursor, clamped to the viewport so it never overflows.
const style = computed(() => {
  const w = 240, m = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const left = Math.min(tipState.x + 14, vw - w - m);
  const top = Math.min(tipState.y + 18, vh - 60);
  return { left: Math.max(m, left) + 'px', top: Math.max(m, top) + 'px' };
});
</script>

<template>
  <Teleport to="body">
    <div class="pd-tip" :class="{ on: tipState.visible }" :style="style">{{ tipState.text }}</div>
  </Teleport>
</template>
