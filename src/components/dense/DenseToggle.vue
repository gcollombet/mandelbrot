<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { showTip, hideTip } from './denseTip';
const { t } = useI18n();
const props = defineProps<{ modelValue: boolean; label: string; desc?: string;
  /** Optional default: marks the row `.mod` when different and a double-click restores it. */
  default?: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    class="fld fld-tog"
    :class="{ mod: props.default !== undefined && modelValue !== props.default }"
    :title="props.default !== undefined ? t('common.dblclickDefault') : undefined"
    @click="emit('update:modelValue', !modelValue)"
    @dblclick="props.default !== undefined && emit('update:modelValue', props.default)"
    @pointerenter="desc && showTip(desc, $event.clientX, $event.clientY)"
    @pointerleave="hideTip()"
  >
    <span class="fld-lab">{{ label }}</span>
    <span class="tog" :class="{ on: modelValue }"></span>
  </button>
</template>

<style scoped>
/* `font: inherit` alone re-inherits the panel's size and overrides the
   dense field size (`--fs`), which made toggles read bigger than sliders. */
.fld-tog { width: 100%; text-align: left; font: inherit; font-size: var(--fs); }
</style>
