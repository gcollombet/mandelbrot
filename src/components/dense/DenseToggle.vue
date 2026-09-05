<script setup lang="ts">
import { showTip, hideTip } from './denseTip';
defineProps<{ modelValue: boolean; label: string; desc?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    class="fld fld-tog"
    @click="emit('update:modelValue', !modelValue)"
    @pointerenter="desc && showTip(desc, $event.clientX, $event.clientY)"
    @pointerleave="hideTip()"
  >
    <span class="fld-lab">{{ label }}</span>
    <span class="tog" :class="{ on: modelValue }"></span>
  </button>
</template>

<style scoped>
.fld-tog { width: 100%; text-align: left; font: inherit; }
</style>
