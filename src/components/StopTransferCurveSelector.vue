<script setup lang="ts">
import type {StopTransferCurve} from '../ColorStop.ts';

const props = defineProps<{
  modelValue: StopTransferCurve;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: StopTransferCurve): void;
}>();

const curves: Array<{ value: StopTransferCurve; label: string; path: string }> = [
  { value: 'linear', label: 'Linear transfer', path: 'M4 24 L44 4' },
  { value: 'gaussian', label: 'Gaussian transfer', path: 'M4 24 L16 24 C21 24 27 20 32 12 C35 7 39 4 44 4' },
  { value: 'square', label: 'Square transfer', path: 'M4 24 L8 24 L8 4 L44 4' },
  { value: 'exponential', label: 'Exponential transfer', path: 'M4 24 C24 24 34 22 44 4' },
];
</script>

<template>
  <div class="curve-selector" role="group" aria-label="Transfer curve">
    <button
      v-for="curve in curves"
      :key="curve.value"
      type="button"
      class="curve-button"
      :class="{ 'is-active': props.modelValue === curve.value }"
      :title="curve.label"
      :aria-label="curve.label"
      :aria-pressed="props.modelValue === curve.value"
      @click="emit('update:modelValue', curve.value)"
    >
      <svg viewBox="0 0 48 28" width="34" height="20" aria-hidden="true">
        <line x1="4" y1="24" x2="44" y2="24" />
        <line x1="4" y1="24" x2="4" y2="4" />
        <path :d="curve.path" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.curve-selector {
  display: inline-grid;
  grid-template-columns: repeat(4, 38px);
  gap: 3px;
  align-items: center;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel-2);
}

.curve-button {
  width: 38px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
}

.curve-button:hover {
  background: var(--row-on);
  color: var(--ink);
}

.curve-button.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-bright);
}

.curve-button svg {
  overflow: visible;
}

.curve-button line {
  stroke: currentColor;
  stroke-width: 1;
  opacity: 0.28;
}

.curve-button path {
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
