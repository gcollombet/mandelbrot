<script setup lang="ts">
import ExpmapRadialControls from './ExpmapRadialControls.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DEFAULT_EXPMAP_EFFECTS, documentEffects, saveDocumentEffects, type ExpmapEffects } from '../expmap/effects'
const props = defineProps<{ documentId: string; tileCount: number }>()
const { t } = useI18n()
const effects = computed(() => documentEffects(props.documentId))
function update(key: keyof ExpmapEffects, event: Event) {
  const text = (event.target as HTMLInputElement).value
  const value = key === 'loopOctaves' ? (event.target as HTMLInputElement).checked : (key === 'rotationMode' || key === 'imageRotationMode') ? text : Number(text)
  try { saveDocumentEffects(props.documentId, { ...effects.value, [key]: value }) } catch { /* Ignore incomplete input. */ }
}
</script>
<template>
  <ExpmapRadialControls :document-id="documentId" :tile-count="tileCount"/>
  <details class="effects">
    <summary>{{ t('expmapControls.effects.summary') }} <span v-if="effects.loopOctaves || effects.droste || effects.kaleidoscope || (effects.imageRotationMode && effects.imageRotationMode !== 'fixed')">{{ t('expmapControls.effects.active') }}</span></summary>
    <div class="fields">
      <label>{{ t('expmapControls.effects.imageRotation') }} <select :aria-label="t('expmapControls.effects.imageRotationAria')" :value="effects.imageRotationMode ?? 'fixed'" @change="update('imageRotationMode', $event)"><option value="fixed">{{ t('expmapControls.effects.manual') }}</option><option value="octave">{{ t('expmapControls.effects.radiansPerOctave') }}</option><option value="droste">{{ t('expmapControls.effects.followDroste') }}</option></select></label>
      <label v-if="effects.imageRotationMode === 'octave'">{{ t('expmapControls.effects.rotation') }} <input :aria-label="t('expmapControls.effects.rotationRateAria')" type="number" :min="-2*Math.PI" :max="2*Math.PI" step="0.01" :value="effects.imageRotationRate ?? 0" @change="update('imageRotationRate', $event)">{{ t('expmapControls.effects.radPerOctave') }}</label>
      <small v-if="effects.imageRotationMode === 'droste'">{{ t('expmapControls.effects.compensation', { value: (-effects.droste * Math.PI / 180).toFixed(3) }) }}</small>
      <label :title="t('expmapControls.effects.drosteTitle')">{{ t('expmapControls.effects.droste') }} <input :aria-label="t('expmapControls.effects.drosteAria')" type="range" min="-180" max="180" step="1" :value="effects.droste" @input="update('droste', $event)"><output>{{ effects.droste }}°/×2</output></label>
      <label>{{ t('expmapControls.effects.kaleidoscope') }} <select :aria-label="t('expmapControls.effects.kaleidoscopeAria')" :value="effects.kaleidoscope" @change="update('kaleidoscope', $event)"><option :value="0">{{ t('expmapControls.effects.disabled') }}</option><option v-for="n in 23" :key="n" :value="n + 1">{{ t('expmapControls.effects.sectors', { count: n + 1 }) }}</option></select></label>
      <label v-if="effects.kaleidoscope">{{ t('expmapControls.effects.orientation') }} <input :aria-label="t('expmapControls.effects.orientationAria')" type="range" min="-180" max="180" step="1" :value="effects.orientation" @input="update('orientation', $event)"><output>{{ effects.orientation }}°</output></label>
      <label v-if="effects.kaleidoscope">{{ t('expmapControls.effects.kaleidoscopeRotation') }} <select :aria-label="t('expmapControls.effects.kaleidoscopeRotationAria')" :value="effects.rotationMode ?? 'fixed'" @change="update('rotationMode', $event)"><option value="fixed">{{ t('expmapControls.effects.fixed') }}</option><option value="progressive">{{ t('expmapControls.effects.progressive') }}</option><option value="droste">{{ t('expmapControls.effects.followsDroste') }}</option></select></label>
      <label v-if="effects.kaleidoscope && effects.rotationMode === 'progressive'">{{ t('expmapControls.effects.speed') }} <input :aria-label="t('expmapControls.effects.speedAria')" type="number" min="-360" max="360" step="1" :value="effects.rotationSpeed ?? 10" @change="update('rotationSpeed', $event)">°/s</label>
      <small v-if="effects.kaleidoscope && effects.rotationMode === 'droste'">{{ t('expmapControls.effects.axesFollow') }}</small>
      <button type="button" @click="saveDocumentEffects(documentId, DEFAULT_EXPMAP_EFFECTS)">{{ t('expmapControls.effects.reset') }}</button>
    </div>
    <small>{{ t('expmapControls.effects.shared') }}</small>
  </details>
</template>
<style scoped>
.effects{margin-top:7px;font-size:12px}summary{cursor:pointer;padding:5px 0;color:#b4c6df}.fields{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0}label{display:flex;gap:6px;align-items:center}input{width:100px;min-width:40px}input[type=checkbox]{width:auto;min-width:0}output{min-width:48px;font-variant-numeric:tabular-nums}select,button{font:inherit;color:inherit;background:#263047;border:1px solid #455271;border-radius:5px;padding:5px;cursor:pointer}small{color:#b4c0d4;font-size:11px}input:focus-visible,select:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid #a8c5ff;outline-offset:2px}
</style>
