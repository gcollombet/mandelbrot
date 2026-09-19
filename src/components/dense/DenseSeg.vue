<script setup lang="ts">
interface SegOption { label: string; value: string | number }
const props = defineProps<{ modelValue: string | number; label?: string; options: SegOption[];
  /** Optional default: marks the row `.mod` when different and a double-click restores it. */
  default?: string | number }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>();
</script>

<template>
  <div class="fld fld-seg" :class="{ mod: props.default !== undefined && modelValue !== props.default }"
    :title="props.default !== undefined ? 'Double-clic : valeur par défaut' : undefined"
    @dblclick="props.default !== undefined && emit('update:modelValue', props.default)">
    <span v-if="label" class="fld-lab seg-lab">{{ label }}</span>
    <div class="seg">
      <button
        v-for="opt in options"
        :key="String(opt.value)"
        :class="{ on: opt.value === modelValue }"
        @click="emit('update:modelValue', opt.value)"
      >{{ opt.label }}</button>
    </div>
  </div>
</template>
