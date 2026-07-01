<script setup lang="ts">
// Curve / shape picker: a row of icon buttons. Each option supplies an SVG path
// (drawn in a 0..24 viewBox) and a value.
interface CurveOption { value: string | number; path: string; title?: string }
defineProps<{ modelValue: string | number; label?: string; options: CurveOption[] }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>();
</script>

<template>
  <div class="fld fld-curve">
    <span v-if="label" class="fld-lab seg-lab">{{ label }}</span>
    <div class="curves">
      <button
        v-for="opt in options"
        :key="String(opt.value)"
        class="curve"
        :class="{ on: opt.value === modelValue }"
        :title="opt.title"
        @click="emit('update:modelValue', opt.value)"
      >
        <svg viewBox="0 0 24 24"><path :d="opt.path" /></svg>
      </button>
    </div>
  </div>
</template>
