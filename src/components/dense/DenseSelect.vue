<script setup lang="ts">
interface SelOption { label: string; value: string | number }
defineProps<{ modelValue: string | number; label?: string; options: SelOption[] }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>();

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value);
}
</script>

<template>
  <div class="fld fld-sel">
    <span v-if="label" class="fld-lab">{{ label }}</span>
    <div class="selbox">
      <select :value="modelValue" @change="onChange">
        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>
  </div>
</template>
