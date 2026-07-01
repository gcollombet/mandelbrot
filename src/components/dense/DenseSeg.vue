<script setup lang="ts">
interface SegOption { label: string; value: string | number }
defineProps<{ modelValue: string | number; label?: string; options: SegOption[] }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number): void }>();
</script>

<template>
  <div class="fld fld-seg">
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
