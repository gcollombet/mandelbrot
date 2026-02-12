<script setup lang="ts">
import {computed, onMounted, ref, toRaw} from 'vue';
import type {MandelbrotParams} from "../Mandelbrot.ts";
import PaletteEditor from './PaletteEditor.vue';

const model =  defineModel<MandelbrotParams>({
  default: {
    angle: 0,
    cx: "0.0",
    cy: "0.0",
    scale: "2.5",
    mu: 1000000.0,
    epsilon: 0.00001,
    colorStops: [],
    palettePeriod: 1,
    antialiasLevel: 1,
    tessellationLevel: 2,
    shadingLevel: 1,
    activatePalette: true,
    activateSkybox: false,
    activateTessellation: false,
    activateWebcam: false,
    activateShading: true,
    activateZebra: false,
    activateSmoothness: true,
  }
});

const angleDeg = computed(() => (model.value.angle  * 180 / Math.PI).toFixed(2));
const scaleSci = computed(() => model.value.scale);
const cxSci = computed(() => model.value.cx);
const cySci = computed(() => model.value.cy);

const presetName = ref('');
const presets = ref<{ name: string, value: MandelbrotParams }[]>([]);
const selectedPreset = ref('');
const STORAGE_KEY = 'mandelbrot_presets';

function savePreset() {
  if (!presetName.value.trim()) return;
  const preset = {
    name: presetName.value.trim(),
    value: model.value
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
    selectedPreset.value = name
    model.value =  structuredClone(toRaw(preset.value))
  }
}

const muSlider = computed({
  get: () => Math.log10(model.value.mu ?? 1.0),
  set: (val: number) => {
    model.value.mu = Math.pow(10, val);
  }
});
const epsilonSlider = computed({
  get: () => Math.log10(model.value.epsilon ?? 1e-8),
  set: (val: number) => {
    model.value.epsilon = Math.pow(10, val);
  }
});

onMounted(() => {
  loadPresets();
  activeTab.value = 'performance'; // Toujours sélectionner l'onglet navigation par défaut
});

const activeTab = ref('navigation');
</script>

<template>
  <div class="block bulma-settings-block" style="color: black !important;">
    <div class="tabs is-toggle is-fullwidth is-small">
      <ul>
        <li :class="{ 'is-active': activeTab === 'navigation' }">
          <a @click="activeTab = 'navigation'">Navigation</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'color' }">
          <a @click="activeTab = 'color'">Palette</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'performance' }">
          <a @click="activeTab = 'performance'">Graphics</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'presets' }">
          <a @click="activeTab = 'presets'">Presets</a>
        </li>
      </ul>
    </div>
    <div v-if="activeTab === 'navigation'">
      <div class="mb-3">
        <span>
          Échelle&nbsp;:
          <span v-html="scaleSci" />
          <button class="button is-small" style="margin-left:0.7em;" @click="model.scale = '2.5'">Réinitialiser</button>
        </span>
      </div>
      <div class="mb-3">
        <p>
          <span>Cx&nbsp;:<span v-html="cxSci" /></span>
        </p>
        <p>
          <span>Cy&nbsp;:<span class="math-i">i</span><span v-html="cySci" /></span>
        </p>
      </div>
      <div class="mb-3">
        <span>
          Angle&nbsp;:
          <span>{{ angleDeg }}°</span>
        </span>
      </div>
    </div>
    <div v-else-if="activeTab === 'color'">
      <div class="mb-3">
        <PaletteEditor :color-stops="model.colorStops" />
      </div>
    </div>
    <div v-else-if="activeTab === 'performance'">
      <div class="field">
        <label class="label">Mu (log)</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0" max="5" step="0.01" v-model="muSlider" />
        </div>
        <span>{{ (model.mu ?? 1.0).toFixed(1) }}</span>
      </div>
      <div class="field">
        <label class="label">Epsilon (log)</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="-12" max="0" step="0.01" v-model="epsilonSlider" />
        </div>
        <span>{{ (model.epsilon ?? 1e-8).toExponential(2) }}</span>
      </div>
      <div class="field">
        <label class="label">Palette period</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0.1" max="10" step="0.1" v-model.number="model.palettePeriod" />
        </div>
        <span>{{ model.palettePeriod }}</span>
      </div>
      <div class="field">
        <label class="label">Tessellation</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0.1" max="10" step="0.1" v-model.number="model.tessellationLevel" />
        </div>
        <span>{{ model.tessellationLevel }}</span>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activateWebcam" />
          &nbsp;Activer la webcam
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activateTessellation" />
          &nbsp;Tessellation GPU
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activateShading" />
          &nbsp;Shading avancé
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activateSkybox" />
          &nbsp;Skybox
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activatePalette" />
          &nbsp;Palette
        </label>
      </div>
    </div>
    <div v-else-if="activeTab === 'presets'">
      <div class="mb-3">
        <div class="field">
          <label class="label">Presets enregistrés</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select v-model="selectedPreset" @change="selectPreset(selectedPreset)">
                <option value="" disabled>Choisir un preset...</option>
                <option v-for="preset in presets" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="field is-grouped">
          <div class="control is-expanded">
            <input class="input" v-model="presetName" type="text" placeholder="Nom..." />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePreset">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bulma-settings-block {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(8px) contrast(110%);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-radius: 8px;
  padding: 1.2em 1.5em;
  width: 420px;
  height: 100%;
  max-width: 100vw;
}
.mb-3 {
  margin-bottom: 1.2em;
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