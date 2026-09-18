<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { showTip, hideTip } from './denseTip';

// One full-width line for an arbitrary-precision decimal (Cx, Cy, scale):
// mono, middle-truncated so both the leading digits and the tail stay
// visible, with the digit count, a per-line copy button and click-to-edit.

const props = withDefaults(defineProps<{
  label: string;
  modelValue: string;
  /** Display transform when not editing (e.g. scientific notation). The edit
   *  box opens on the same text; the raw value is used when absent. */
  format?: (value: string) => string;
  /** Validate/normalise the typed text; return null to reject. */
  parse?: (text: string) => string | null;
  /** Characters kept on screen before the middle ellipsis kicks in. */
  maxChars?: number;
  placeholder?: string;
  suspendShortcuts?: (suspend: boolean) => void;
}>(), { maxChars: 34, placeholder: '0.0' });

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const editing = ref(false);
const editText = ref('');
const editRef = ref<HTMLInputElement | null>(null);
const copied = ref(false);

const shown = computed(() => props.format ? props.format(props.modelValue) : props.modelValue);

const truncated = computed(() => {
  const s = shown.value;
  const max = Math.max(12, props.maxChars);
  if (s.length <= max) return s;
  const tail = Math.min(10, Math.floor(max / 3));
  return `${s.slice(0, max - tail - 1)}…${s.slice(-tail)}`;
});

/** Significant digits of the raw value (mantissa digits, leading zeros excluded). */
const digitCount = computed(() => {
  const m = /^\s*[+-]?(\d*)(?:\.(\d*))?(?:[eE][+-]?\d+)?\s*$/.exec(props.modelValue);
  if (!m) return 0;
  const digits = ((m[1] ?? '') + (m[2] ?? '')).replace(/^0+/, '');
  return digits.length;
});

function beginEdit() {
  hideTip();
  editText.value = shown.value;
  editing.value = true;
  props.suspendShortcuts?.(true);
  nextTick(() => { editRef.value?.focus(); editRef.value?.select(); });
}

function commitEdit() {
  if (!editing.value) return;
  editing.value = false;
  props.suspendShortcuts?.(false);
  const text = editText.value.trim().replace(',', '.');
  if (!text || text === shown.value) return;
  const next = props.parse ? props.parse(text) : text;
  if (next !== null && next !== props.modelValue) emit('update:modelValue', next);
}

function cancelEdit() {
  editing.value = false;
  props.suspendShortcuts?.(false);
}

function copy() {
  navigator.clipboard?.writeText(props.modelValue);
  copied.value = true;
  window.setTimeout(() => { copied.value = false; }, 1200);
}
</script>

<template>
  <div class="cfld" :class="{ editing }">
    <span class="cfld-lab">{{ label }}</span>
    <input
      v-if="editing"
      ref="editRef"
      class="cfld-edit"
      type="text"
      inputmode="decimal"
      spellcheck="false"
      :aria-label="label"
      :placeholder="placeholder"
      v-model="editText"
      @keydown.stop
      @keydown.enter.prevent="commitEdit"
      @keydown.esc.prevent="cancelEdit"
      @blur="commitEdit"
    />
    <button
      v-else
      type="button"
      class="cfld-val"
      :aria-label="`Modifier ${label} : ${modelValue}`"
      @click="beginEdit"
      @pointerenter="showTip(modelValue, $event.clientX, $event.clientY)"
      @pointerleave="hideTip()"
    >{{ truncated || placeholder }}</button>
    <span v-if="!editing && digitCount" class="cfld-digits" :title="`${digitCount} chiffres significatifs`">{{ digitCount }}</span>
    <button type="button" class="cfld-copy" :class="{ ok: copied }" :title="`Copier ${label}`" :aria-label="`Copier ${label}`" @click="copy">
      <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
    </button>
  </div>
</template>

<style scoped>
.cfld {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--rh, 30px);
  padding: 0 6px 0 9px;
  background: var(--row);
  border: 1px solid var(--line-soft);
  border-radius: 7px;
  min-width: 0;
}
.cfld.editing { border-color: var(--accent); }
.cfld-lab {
  flex: none;
  width: 24px;
  font-size: var(--fs, 12px);
  color: var(--ink-3);
}
.cfld-val, .cfld-edit {
  flex: 1 1 auto;
  min-width: 0;
  height: 22px;
  padding: 0 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ink);
  font-family: var(--mono);
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
}
.cfld-val { cursor: text; }
.cfld-val:hover { background: rgba(255, 255, 255, 0.05); }
.cfld-edit {
  background: rgba(0, 0, 0, 0.35);
  outline: none;
  text-overflow: clip;
}
.cfld-digits {
  flex: none;
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-4, var(--ink-3));
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}
.cfld-copy {
  flex: none;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  transition: color .15s, background .15s;
}
.cfld-copy:hover { color: var(--ink); background: rgba(255, 255, 255, 0.08); }
.cfld-copy.ok { color: var(--accent-bright, var(--accent)); }
.cfld-copy svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
