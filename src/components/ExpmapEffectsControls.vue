<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_EXPMAP_EFFECTS, documentEffects, saveDocumentEffects, type ExpmapEffects } from '../expmap/effects'
const props = defineProps<{ documentId: string }>()
const effects = computed(() => documentEffects(props.documentId))
function update(key: keyof ExpmapEffects, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  try { saveDocumentEffects(props.documentId, { ...effects.value, [key]: value }) } catch { /* Ignore incomplete input. */ }
}
</script>
<template>
  <details class="effects">
    <summary>Effets <span v-if="effects.droste || effects.kaleidoscope">· actifs</span></summary>
    <div class="fields">
      <label title="Torsion par doublement de zoom">Droste <input aria-label="Droste en degrés par doublement" type="range" min="-180" max="180" step="1" :value="effects.droste" @input="update('droste', $event)"><output>{{ effects.droste }}°/×2</output></label>
      <label>Kaléidoscope <select aria-label="Secteurs du kaléidoscope" :value="effects.kaleidoscope" @change="update('kaleidoscope', $event)"><option :value="0">Désactivé</option><option v-for="n in 23" :key="n" :value="n + 1">{{ n + 1 }} secteurs</option></select></label>
      <label v-if="effects.kaleidoscope">Orientation <input aria-label="Orientation du kaléidoscope" type="range" min="-180" max="180" step="1" :value="effects.orientation" @input="update('orientation', $event)"><output>{{ effects.orientation }}°</output></label>
      <button type="button" @click="saveDocumentEffects(documentId, DEFAULT_EXPMAP_EFFECTS)">Réinitialiser</button>
    </div>
    <small>Réglages communs au lecteur et à la vidéo, mémorisés pour ce document.</small>
  </details>
</template>
<style scoped>
.effects{margin-top:7px;font-size:12px}summary{cursor:pointer;padding:5px 0;color:#b4c6df}.fields{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0}label{display:flex;gap:6px;align-items:center}input{width:100px;min-width:40px}output{min-width:48px;font-variant-numeric:tabular-nums}select,button{font:inherit;color:inherit;background:#263047;border:1px solid #455271;border-radius:5px;padding:5px;cursor:pointer}small{color:#b4c0d4;font-size:11px}input:focus-visible,select:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid #a8c5ff;outline-offset:2px}
</style>
