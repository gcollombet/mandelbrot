<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useDenseScrub } from './useDenseScrub';
import { formatValue, type DenseFormatter } from './denseFormat';
import { showTip, hideTip } from './denseTip';

const props = withDefaults(defineProps<{
  modelValue: number;
  label: string;
  min: number;
  max: number;
  step?: number;
  /** Formatter: 'p0'..'p3' or (v)=>string. */
  f?: DenseFormatter;
  unit?: string;
  /** Optional default; when set, the row shows the `.mod` state when value ≠ default. */
  default?: number;
  /** Inline description (shown in data-desc="inline" mode). */
  desc?: string;
}>(), {
  step: 1,
});

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>();

const editing = ref(false);
const editText = ref('');
const editRef = ref<HTMLInputElement | null>(null);

const { scrubbing, onPointerDown, onPointerMove, endScrub, clampStep } = useDenseScrub({
  min: props.min,
  max: props.max,
  step: props.step,
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const fillPct = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return 0;
  return Math.min(100, Math.max(0, ((props.modelValue - props.min) / range) * 100));
});

const valText = computed(() => formatValue(props.modelValue, props.f, props.unit));

const isMod = computed(() => props.default !== undefined && props.modelValue !== props.default);

function beginEdit() {
  editText.value = String(props.modelValue);
  editing.value = true;
  nextTick(() => { editRef.value?.focus(); editRef.value?.select(); });
}

function commitEdit() {
  if (!editing.value) return;
  editing.value = false;
  const parsed = Number(editText.value.replace(',', '.'));
  if (!Number.isNaN(parsed)) emit('update:modelValue', clampStep(parsed));
}

function cancelEdit() {
  editing.value = false;
}
</script>

<template>
  <div
    class="fld"
    :class="{ scrub: scrubbing, mod: isMod }"
    @pointerdown="hideTip(); onPointerDown($event)"
    @pointermove="onPointerMove"
    @pointerup="endScrub"
    @pointercancel="endScrub"
    @dblclick="beginEdit"
    @pointerenter="desc && showTip(desc, $event.clientX, $event.clientY)"
    @pointerleave="hideTip()"
  >
    <div class="fld-fill" :style="{ width: fillPct + '%' }"></div>
    <span class="fld-lab">{{ label }}</span>
    <span v-if="desc" class="fld-desc">{{ desc }}</span>
    <input
      v-if="editing"
      ref="editRef"
      class="fld-edit"
      v-model="editText"
      @pointerdown.stop
      @dblclick.stop
      @keydown.enter.prevent="commitEdit"
      @keydown.esc.prevent="cancelEdit"
      @blur="commitEdit"
    />
    <span v-else class="fld-val">{{ valText }}</span>
  </div>
</template>
