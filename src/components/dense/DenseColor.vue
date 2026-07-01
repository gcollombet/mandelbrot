<script setup lang="ts">
defineProps<{ modelValue: string; label?: string; clearable?: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
  (e: 'clear'): void;
}>();

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="fld fld-col">
    <span v-if="label" class="fld-lab">{{ label }}</span>
    <span class="swatch" :style="{ background: modelValue }">
      <input type="color" :value="modelValue" @input="onInput" />
    </span>
    <span class="hex">{{ modelValue }}</span>
    <button v-if="clearable" class="col-clr" title="Clear" @click="emit('clear')">✕</button>
  </div>
</template>
