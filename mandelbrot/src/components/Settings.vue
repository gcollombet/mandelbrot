<script setup lang="ts">
import { defineProps, computed, ref, onMounted } from 'vue';
import type { MandelbrotParams } from "../Mandelbrot.ts";

const props = defineProps<{ modelValue: MandelbrotParams }>();

function formatScientific(val: number, digits = 8) {
  if (val === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(val)));
  const coeff = val / Math.pow(10, exp);
  // Utilise l'exposant unicode
  const expStr = exp === 0 ? '' : `×10${toSuperscript(exp)}`;
  return `${coeff.toFixed(digits)}${expStr}`;
}

function toSuperscript(n: number) {
  // Convertit un nombre en exposant unicode
  const sup = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  // @ts-ignore
  return String(n).split('').map(c => sup[c] ?? c).join('');
}

const angleDeg = computed(() => (props.modelValue.angle * 180 / Math.PI).toFixed(2));
const scaleSci = computed(() => formatScientific(props.modelValue.scale));
const cxSci = computed(() => formatScientific(props.modelValue.cx));
const cySci = computed(() => formatScientific(props.modelValue.cy));

const presetName = ref('');
const presets = ref<{ name: string, cx: number, cy: number, scale: number, angle: number }[]>([]);
const selectedPreset = ref('');
const STORAGE_KEY = 'mandelbrot_presets';

function savePreset() {
  if (!presetName.value.trim()) return;
  const preset = {
    name: presetName.value.trim(),
    cx: props.modelValue.cx,
    cy: props.modelValue.cy,
    scale: props.modelValue.scale,
    angle: props.modelValue.angle,
  };
  const idx = presets.value.findIndex(p => p.name === preset.name);
  if (idx >= 0) {
    presets.value[idx] = preset;
  } else {
    presets.value.push(preset);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value));
  presetName.value = '';
}

function loadPresets() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      presets.value = JSON.parse(raw);
    } catch {}
  }
}

function selectPreset(name: string) {
  const preset = presets.value.find(p => p.name === name);
  if (preset) {
    props.modelValue.cx = preset.cx;
    props.modelValue.cy = preset.cy;
    props.modelValue.scale = preset.scale;
    props.modelValue.angle = preset.angle;
    selectedPreset.value = name;
  }
}

onMounted(() => {
  loadPresets();
});
</script>

<template>
  <nav class="panel compact-panel">
    <p class="panel-heading compact-heading">Paramètres</p>
    <!-- Affichage mathématique -->
    <div class="panel-block compact-block">
      <span class="math-display">
        Échelle&nbsp;:
        <span v-html="scaleSci" />
      </span>
    </div>
    <div class="panel-block compact-block">
      <p>
        <span class="math-display">Cx&nbsp;:<span v-html="cxSci" /></span>
      </p>
      <p>
        <span class="math-display">Cy&nbsp;:<span class="math-i">i</span><span v-html="cySci" /></span>
      </p>
    </div>
    <div class="panel-block compact-block">
      <span class="math-display">
        Angle&nbsp;:
        <span>{{ angleDeg }}°</span>
      </span>
    </div>
    <div class="panel-block compact-block">
      <label class="compact-label">Presets enregistrés</label>
      <div style="display: flex; flex-direction: column; gap: 0.3em;">
        <select class="select compact-select" v-model="selectedPreset" @change="selectPreset(selectedPreset)" style="width: 100%;">
          <option value="" disabled>Choisir un preset...</option>
          <option v-for="preset in presets" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
        </select>
      </div>
    </div>
    <!-- Gestion des presets -->
    <div class="panel-block compact-block">
      <label class="compact-label">Nom du preset</label>
      <div style="display: flex; gap: 0.5em; align-items: center;">
        <input class="input compact-input" v-model="presetName" type="text" placeholder="Nom..." style="width: 8em;" />
        <button class="button is-link is-small" @click="savePreset">Enregistrer</button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.compact-panel {
  color: #000 !important;
  max-width: 320px;
  margin: 0.5em;
  background: rgba(255,255,255,0.50);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-radius: 0.7em;
  padding: 0.5em 0.7em;
}
.compact-heading {
  color: #000;
  font-size: 1.1em;
  background: rgba(255,255,255,0.15);
  padding: 0.3em 0.2em;
}
.compact-block {
  color: #000;
  margin-bottom: 0.3em;
  padding: 0.2em 0;
  display: flex;
  flex-direction: column;
}
.math-display {
  color: #000;
  font-family: 'STIX Two Math', 'Cambria Math', 'Latin Modern Math', 'Times New Roman', serif;
  font-size: 1.15em;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 0.3em;
}
.math-i {
  color: #000;
  font-style: italic;
  margin: 0 0.1em;
}
.compact-label {
  font-weight: bold;
  margin-bottom: 0.2em;
}
.compact-input, .compact-select {
  font-size: 0.9em;
}
</style>