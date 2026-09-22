<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DenseSelect } from './dense'
import { VIDEO_RESOLUTIONS, type ResolutionPreset } from './resolutionPresets'
const { t } = useI18n()
const props = withDefaults(defineProps<{ width: number; height: number; label?: string; presets?: ResolutionPreset[]; min?: number; max?: number; step?: number }>(), { label: undefined, presets: () => VIDEO_RESOLUTIONS, min: 2, max: 3840, step: 2 })
const selectLabel = computed(() => props.label ?? t('videoControls.resolution.label'))
const emit = defineEmits<{ 'update:width': [number]; 'update:height': [number] }>()
const key = (w: number, h: number) => `${w}x${h}`
const selected = computed({
  get: () => key(props.width, props.height),
  set: (value: string | number) => { const [w, h] = String(value).split('x').map(Number); if (Number.isFinite(w) && Number.isFinite(h)) { emit('update:width', w); emit('update:height', h) } },
})
const options = computed(() => {
  const list = props.presets.map(p => ({ value: key(p.width, p.height), label: p.labelKey ? t(p.labelKey, { width: p.width, height: p.height }) : p.label }))
  if (!list.some(o => o.value === selected.value)) list.push({ value: selected.value, label: t('videoControls.resolution.custom', { width: props.width, height: props.height }) })
  return list
})
function clamp(raw: string) {
  const n = Math.round(Number(raw) / props.step) * props.step
  return Number.isFinite(n) ? Math.min(props.max, Math.max(props.min, n)) : null
}
function setWidth(e: Event) { const v = clamp((e.target as HTMLInputElement).value); if (v !== null) emit('update:width', v) }
function setHeight(e: Event) { const v = clamp((e.target as HTMLInputElement).value); if (v !== null) emit('update:height', v) }
</script>
<template>
  <div class="resolution">
    <DenseSelect v-model="selected" :label="selectLabel" :options="options"/>
    <details class="custom"><summary>{{ t('videoControls.resolution.exactDimensions') }}</summary>
      <div class="dims">
        <label>{{ t('videoControls.resolution.width') }} <input type="number" inputmode="numeric" :value="width" :min="min" :max="max" :step="step" @change="setWidth"></label>
        <span aria-hidden="true">×</span>
        <label>{{ t('videoControls.resolution.height') }} <input type="number" inputmode="numeric" :value="height" :min="min" :max="max" :step="step" @change="setHeight"></label>
      </div>
    </details>
  </div>
</template>
<style scoped>
.resolution{display:grid;gap:2px}.custom>summary{cursor:pointer;font-size:10px;opacity:.7;padding:2px 0}.dims{display:flex;align-items:center;gap:6px;margin:3px 0}.dims label{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;font-size:10px;white-space:nowrap}.dims input{width:100%;min-width:0;background:var(--row);color:inherit;border:1px solid var(--line);border-radius:4px;padding:3px}
</style>
