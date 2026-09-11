<script setup lang="ts">
import ExpmapRadialControls from './ExpmapRadialControls.vue'
import { computed } from 'vue'
import { DEFAULT_EXPMAP_EFFECTS, documentEffects, saveDocumentEffects, type ExpmapEffects } from '../expmap/effects'
const props = defineProps<{ documentId: string; tileCount: number }>()
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
    <summary>Rotation, Droste et kaléidoscope angulaire <span v-if="effects.loopOctaves || effects.droste || effects.kaleidoscope || (effects.imageRotationMode && effects.imageRotationMode !== 'fixed')">· actifs</span></summary>
    <div class="fields">
      <label>Rotation de l’image <select aria-label="Mode de rotation de l’image" :value="effects.imageRotationMode ?? 'fixed'" @change="update('imageRotationMode', $event)"><option value="fixed">Manuelle</option><option value="octave">Radians par octave</option><option value="droste">Suivre Droste exactement</option></select></label>
      <label v-if="effects.imageRotationMode === 'octave'">Rotation <input aria-label="Rotation en radians par octave" type="number" :min="-2*Math.PI" :max="2*Math.PI" step="0.01" :value="effects.imageRotationRate ?? 0" @change="update('imageRotationRate', $event)">rad/octave</label>
      <small v-if="effects.imageRotationMode === 'droste'">Compensation : {{ (-effects.droste * Math.PI / 180).toFixed(3) }} rad/octave. La torsion reste visible, sa rotation avec le zoom est suivie.</small>
      <label title="Torsion par doublement de zoom">Droste <input aria-label="Droste en degrés par doublement" type="range" min="-180" max="180" step="1" :value="effects.droste" @input="update('droste', $event)"><output>{{ effects.droste }}°/×2</output></label>
      <label>Kaléidoscope angulaire <select aria-label="Secteurs du kaléidoscope" :value="effects.kaleidoscope" @change="update('kaleidoscope', $event)"><option :value="0">Désactivé</option><option v-for="n in 23" :key="n" :value="n + 1">{{ n + 1 }} secteurs</option></select></label>
      <label v-if="effects.kaleidoscope">Orientation <input aria-label="Orientation du kaléidoscope" type="range" min="-180" max="180" step="1" :value="effects.orientation" @input="update('orientation', $event)"><output>{{ effects.orientation }}°</output></label>
      <label v-if="effects.kaleidoscope">Rotation du kaléidoscope <select aria-label="Mode de rotation du kaléidoscope" :value="effects.rotationMode ?? 'fixed'" @change="update('rotationMode', $event)"><option value="fixed">Fixe</option><option value="progressive">Progressive</option><option value="droste">Suit Droste</option></select></label>
      <label v-if="effects.kaleidoscope && effects.rotationMode === 'progressive'">Vitesse <input aria-label="Vitesse de rotation du kaléidoscope" type="number" min="-360" max="360" step="1" :value="effects.rotationSpeed ?? 10" @change="update('rotationSpeed', $event)">°/s</label>
      <small v-if="effects.kaleidoscope && effects.rotationMode === 'droste'">Les axes suivent la phase de Droste avec le zoom.</small>
      <button type="button" @click="saveDocumentEffects(documentId, DEFAULT_EXPMAP_EFFECTS)">Réinitialiser</button>
    </div>
    <small>Réglages communs au lecteur et à la vidéo, mémorisés pour ce document.</small>
  </details>
</template>
<style scoped>
.effects{margin-top:7px;font-size:12px}summary{cursor:pointer;padding:5px 0;color:#b4c6df}.fields{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0}label{display:flex;gap:6px;align-items:center}input{width:100px;min-width:40px}input[type=checkbox]{width:auto;min-width:0}output{min-width:48px;font-variant-numeric:tabular-nums}select,button{font:inherit;color:inherit;background:#263047;border:1px solid #455271;border-radius:5px;padding:5px;cursor:pointer}small{color:#b4c0d4;font-size:11px}input:focus-visible,select:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid #a8c5ff;outline-offset:2px}
</style>
