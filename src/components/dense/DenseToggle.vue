<script setup lang="ts">
import { showTip, hideTip } from './denseTip';
defineProps<{ modelValue: boolean; label: string; desc?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
</script>

<template>
  <div
    class="fld fld-tog"
    @click="emit('update:modelValue', !modelValue)"
    @pointerenter="desc && showTip(desc, $event.clientX, $event.clientY)"
    @pointerleave="hideTip()"
  >
    <span class="fld-lab">{{ label }}</span>
    <span class="tog" :class="{ on: modelValue }"></span>
  </div>
</template>
