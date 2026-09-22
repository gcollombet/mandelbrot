<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { canonicalScale } from '../expmap/decimal'
import { zoomDepth, scaleFromDepth, ZOOM_DEPTH_MIN, ZOOM_DEPTH_MAX } from '../expmap/controls'
const props = withDefaults(defineProps<{ modelValue: string; label: string; slider?: boolean; captureLabel?: string; captureDisabled?: boolean }>(), { slider: true })
const { t } = useI18n()
const captureText = computed(() => props.captureLabel ?? t('expmapControls.zoom.currentZoom'))
const emit = defineEmits<{ 'update:modelValue': [value: string]; capture: [] }>()
const input = ref<HTMLInputElement | null>(null)
const editing = ref(false), text = ref(''), errorKey = ref('')
const error = computed(() => errorKey.value ? t(errorKey.value) : '')
const depth = computed(() => { try { return zoomDepth(props.modelValue) } catch { return 0 } })
const labelValue = computed(() => { try { return `10^${canonicalScale(props.modelValue).split('e')[1]}` } catch { return t('expmapControls.zoom.define') } })
watch(() => props.modelValue, () => { errorKey.value = '' })
function edit() { text.value = props.modelValue; editing.value = true; nextTick(() => { input.value?.focus(); input.value?.select() }) }
function commit() {
  try { emit('update:modelValue', canonicalScale(text.value)); editing.value = false; errorKey.value = '' }
  catch { errorKey.value = 'expmapControls.zoom.scaleError' }
}
function nudge(delta: number) { emit('update:modelValue', scaleFromDepth(depth.value + delta)) }
</script>
<template>
  <div class="zoom-control">
    <div class="zoom-row">
      <span>{{ label }}</span>
      <input v-if="editing" ref="input" v-model="text" :aria-label="t('expmapControls.zoom.preciseAria', { label })" @change="commit" @keydown.enter.prevent="commit" @keydown.esc="editing = false">
      <button v-else class="scale-value" :title="t('expmapControls.zoom.clickToEdit', { value: modelValue })" @click="edit">{{ labelValue }}</button>
      <button @click="emit('capture')" :disabled="captureDisabled">{{ captureText }}</button>
      <slot />
    </div>
    <div v-if="slider" class="zoom-slider">
      <button :aria-label="t('expmapControls.zoom.zoomOutAria', { label })" @click="nudge(-1)">−</button>
      <input type="range" :aria-label="t('expmapControls.zoom.depthAria', { label })" :min="ZOOM_DEPTH_MIN" :max="ZOOM_DEPTH_MAX" step="1" :value="depth" @input="emit('update:modelValue', scaleFromDepth(Number(($event.target as HTMLInputElement).value)))">
      <button :aria-label="t('expmapControls.zoom.zoomInAria', { label })" @click="nudge(1)">+</button>
    </div>
    <small v-if="slider && (depth < ZOOM_DEPTH_MIN || depth > ZOOM_DEPTH_MAX)">{{ t('expmapControls.zoom.outOfRange') }}</small>
    <small v-if="error" role="alert">{{ error }}</small>
  </div>
</template>
<style scoped>
.zoom-control{margin:8px 0}.zoom-row,.zoom-slider{display:flex;align-items:center;gap:6px}.zoom-row{flex-wrap:wrap}.zoom-row>span{min-width:46px}.scale-value{margin-right:auto;font-variant-numeric:tabular-nums}.zoom-slider{margin-top:4px}.zoom-slider input{flex:1;min-width:0;accent-color:#8ab5fa}.zoom-row input{width:120px;flex:1;min-width:60px}button,input:not([type=range]){background:#ffffff0b;color:inherit;border:1px solid #ffffff25;border-radius:5px;padding:4px 7px;font-size:12px}button:disabled{opacity:.45}button:focus-visible,input:focus-visible{outline:2px solid #8ab5fa;outline-offset:2px}small{color:#d9b889;font-size:11px}
</style>
