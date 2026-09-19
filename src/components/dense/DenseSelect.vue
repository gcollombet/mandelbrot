<script setup lang="ts">
interface SelOption { label: string; value: string | number }
const props = defineProps<{ modelValue: string | number; label?: string; disabled?: boolean; options: readonly SelOption[];
  /** Optional default: marks the row `.mod` when different and a double-click restores it. */
  default?: string | number }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>();

function reset() {
  if (props.default !== undefined && !props.disabled) emit('update:modelValue', props.default);
}

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value);
}
</script>

<template>
  <div class="fld fld-sel" :class="{ mod: props.default !== undefined && modelValue !== props.default }"
    :title="props.default !== undefined ? 'Double-clic : valeur par défaut' : undefined" @dblclick="reset">
    <span v-if="label" class="fld-lab">{{ label }}</span>
    <div class="selbox">
      <select :aria-label="label" :disabled="disabled" :value="modelValue" @change="onChange">
        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
  </div>
</template>
