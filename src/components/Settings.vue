<script setup lang="ts">
import {computed, onMounted, ref, toRaw} from 'vue';
import type {MandelbrotParams} from "../Mandelbrot.ts";
import PaletteEditor from './PaletteEditor.vue';
import { Palette } from '../Palette.ts';

import type { Engine } from '../Engine.ts';
const props = defineProps<{ engine: Engine | null; suspendShortcuts?: (suspend: boolean) => void }>();
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
    paletteOffset: 0,
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
    activateMotionBlur: false,
    motionBlurStrength: 0.5,
    motionBlurSamples: 8,
  }
});


const angleDeg = computed(() => (((model.value.angle * 180 / Math.PI) % 360 + 360) % 360).toFixed(2));
// Slider rotation : angle en ° mod 360 (wrapping)
const angleSlider = computed({
  get: () => (((model.value.angle * 180 / Math.PI) % 360 + 360) % 360),
  set: (deg: number) => {
    // [0, 360) vers radian
    model.value.angle = (deg % 360) * Math.PI / 180;
  },
});
// Slider palette period : logarithmique, 0–1 ↔ 1–100
const sliderPalettePeriod = computed({
  get: () => (Math.log10(model.value.palettePeriod || 0.01) + 2) / 5,
  set: val => {
    model.value.palettePeriod = Number((10 ** (val * 5 - 2)).toPrecision(6));
  }
});
// Slider log2(scale) : valeurs de slider 1 à 126 —> scale de 2^-1 à 2^-126
const scaleSlider = computed({
  get: () => {
    // Clamp la scale, éviter NaN si vide
    const s = Number(model.value.scale);
    const slider = s > 0 ? -Math.log2(s) : 126;
    if (!isFinite(slider)) return 1;
    return Math.min(Math.max(Math.round(slider), 1), 126); // Entre 1 et 126
  },
  set: (val: number) => {
    // Clamp entre 1 et 126
    const v = Math.min(Math.max(Math.round(val), 1), 126);
    model.value.scale = (2 ** -v).toPrecision(10);
  }
});

function truncateDecimal(str: string, digits: number): string {
  const [intPart, decPart] = str.split(".");
  if (!decPart) return intPart;
  return intPart + "." + decPart.slice(0, digits);
}

function generatePaletteThumbnail(colorStops: any[]): string {
  // Génère une image de la palette sous forme de data URL (format horizontal)
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  if (colorStops.length === 0) {
    // Palette vide : fond noir
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }
  
  // Utilise la classe Palette pour générer le gradient
  const palette = new Palette(colorStops);
  const imageData = palette.generateTexture();
  
  // Crée un canvas temporaire pour l'ImageData
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = 1;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return '';
  tempCtx.putImageData(imageData, 0, 0);
  
  // Étire l'image sur toute la hauteur du canvas
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/png');
}

const navigationPreview = ref<string | null>(null);
const presetName = ref('');
const presets = ref<{ name: string, value: MandelbrotParams, thumbnail?: string, date?: string }[]>([]);

// Palette management
const paletteName = ref('');
const palettes = ref<{ name: string, colorStops: any[], thumbnail?: string, date?: string }[]>([]);
const selectedPalette = ref('');
const showPaletteDropdown = ref(false);

function deletePreset() {
  const name = presetName.value.trim();
  if (!name) return;
  if (window.confirm(`Supprimer le preset "${name}" ? Cette action est irréversible.`)) {
    const idx = presets.value.findIndex(p => p.name === name);
    if (idx >= 0) {
      presets.value.splice(idx, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value));
      selectedPreset.value = '';
      presetName.value = '';
    }
  }
}

async function refreshNavigationPreview() {
  if (props.engine) {
    navigationPreview.value = await props.engine.getSnapshotPng(256);
  }
}

const selectedPreset = ref('');
const showPresetDropdown = ref(false);

const currentPresetObj = computed(() => presets.value.find(p => p.name === selectedPreset.value));
const currentPresetThumbnail = computed(() => currentPresetObj.value?.thumbnail);

function selectPresetFromDropdown(preset: { name: string, value: MandelbrotParams, thumbnail?:string, date?:string }) {
  selectPreset(preset.name);
  showPresetDropdown.value = false;
}

const STORAGE_KEY = 'mandelbrot_presets';
const PALETTE_STORAGE_KEY = 'mandelbrot_palettes';

async function savePreset() {
  if (!presetName.value.trim()) return;
  let thumbnail: string | undefined = undefined;
  let now = new Date().toISOString();
  try {
    if (props.engine) {
      thumbnail = await props.engine.getSnapshotPng(256);
    }
  } catch { /* ignore errors, no thumbnail */ }
  const preset = {
    name: presetName.value.trim(),
    value: model.value,
    thumbnail,
    date: now
  };
  const idx = presets.value.findIndex(p => p.name === preset.name);
  if (idx >= 0) {
    // on écrase tout, y compris la miniature et la date !
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

function loadPalettes() {
  const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
  if (raw) {
    try {
      palettes.value = JSON.parse(raw);
    } catch {}
  }
}

async function savePalette() {
  if (!paletteName.value.trim()) return;
  let thumbnail: string | undefined = undefined;
  let now = new Date().toISOString();
  try {
    // Génère une miniature de la palette (gradient) au lieu du fractal
    thumbnail = generatePaletteThumbnail(model.value.colorStops);
  } catch { /* ignore errors, no thumbnail */ }
  const palette = {
    name: paletteName.value.trim(),
    colorStops: structuredClone(toRaw(model.value.colorStops)),
    thumbnail,
    date: now
  };
  const idx = palettes.value.findIndex(p => p.name === palette.name);
  if (idx >= 0) {
    palettes.value[idx] = palette;
  } else {
    palettes.value.push(palette);
  }
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
  paletteName.value = '';
}

function selectPalette(name: string) {
  const palette = palettes.value.find(p => p.name === name);
  if (palette) {
    selectedPalette.value = name;
    paletteName.value = palette.name;
    model.value.colorStops = structuredClone(toRaw(palette.colorStops));
  }
}

function selectPaletteFromDropdown(palette: { name: string, colorStops: any[], thumbnail?: string, date?: string }) {
  selectPalette(palette.name);
  showPaletteDropdown.value = false;
}

function deletePalette() {
  const name = paletteName.value.trim();
  if (!name) return;
  if (window.confirm(`Supprimer la palette "${name}" ? Cette action est irréversible.`)) {
    const idx = palettes.value.findIndex(p => p.name === name);
    if (idx >= 0) {
      palettes.value.splice(idx, 1);
      localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
      selectedPalette.value = '';
      paletteName.value = '';
    }
  }
}

function selectPreset(name: string) {
  const preset = presets.value.find(p => p.name === name);
  if (preset) {
    selectedPreset.value = name;
    presetName.value = preset.name; // Remplit pour écrasement rapide
    model.value = structuredClone(toRaw(preset.value));
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
  // Recharge l'état courant depuis le localStorage
  loadPresets();
  loadPalettes();
});


const activeTab = ref('navigation');
const currentPaletteObj = computed(() => palettes.value.find(p => p.name === selectedPalette.value));
const currentPaletteThumbnail = computed(() => currentPaletteObj.value?.thumbnail);

import { watch } from 'vue';

watch([activeTab, () => props.engine], async ([tab]) => {
  if (tab === 'navigation') {
    await refreshNavigationPreview();
  }
}, { immediate: true });

</script>

<template>
  <div class="block bulma-settings-block" style="color: black !important;">
    <div class="tabs is-toggle is-fullwidth is-small">
      <ul>
        <li :class="{ 'is-active': activeTab === 'navigation' }">
          <a @click="activeTab = 'navigation'">Navigation</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'presets' }">
          <a @click="activeTab = 'presets'">Presets</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'palettes' }">
          <a @click="activeTab = 'palettes'">Palettes</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'performance' }">
          <a @click="activeTab = 'performance'">Graphics</a>
        </li>
      </ul>
    </div>
    <div class="tab-content">
    <div v-if="activeTab === 'navigation'">

      <div class="mb-3" style="font-family: monospace; word-break: break-all; white-space: pre-line;">
        <span>Cx: <span>{{ truncateDecimal(model.cx, 38) }}</span></span><br />
        <span>Cy: <span>{{ truncateDecimal(model.cy, 38) }}</span></span>
      </div>

      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <span>Échelle&nbsp;:
          <span style="font-family: monospace; min-width:7.5em; display:inline-block;">{{ Number(model.scale).toExponential(2) }}</span>
        </span>
        <input class="slider is-fullwidth" style="flex: 1 1 110px; min-width: 85px; margin: 0 0.6em 0 0.6em;" type="range" min="1" max="126" step="1" v-model.number="scaleSlider" />
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <span>Angle&nbsp;:
          <span style="font-family: monospace; min-width:5em; display:inline-block;">{{ angleDeg }}°</span>
        </span>
        <input class="slider is-fullwidth" style="flex: 1 1 110px; min-width: 85px; margin: 0 0.6em 0 0.6em;" type="range" min="0" max="359" step="1" v-model.number="angleSlider" />
      </div>
    </div>
    <div v-else-if="activeTab === 'presets'">
      <div class="mb-3">
        <label class="label">Presets enregistrés</label>
        <!-- Dropdown enrichie Bulma -->
        <div class="dropdown" :class="{ 'is-active': showPresetDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPresetDropdown = !showPresetDropdown" aria-haspopup="true" aria-controls="dropdown-menu-presets" type="button">
              <span style="display:flex; align-items:center; min-height:36px;">
                <img v-if="currentPresetThumbnail" :src="currentPresetThumbnail" alt="miniature" style="height:32px; width:56px; object-fit:cover; margin-right:8px; border-radius:3px; background:#888;" />
                <span style="flex:1 1 auto; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ presetName || 'Choisir un preset...' }}</span>
                <span class="icon is-small" style="margin-left:5px;">
                  <i class="fas fa-angle-down" aria-hidden="true"></i>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-presets" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="preset in presets" :key="preset.name" class="dropdown-item"
                @click.prevent="selectPresetFromDropdown(preset)"
                :class="{ 'is-active': selectedPreset === preset.name }"
                style="display:flex; align-items:center; gap:0.75em;">
                <img v-if="preset.thumbnail" :src="preset.thumbnail" alt="miniature"
                  style="height:63px; width:112px; object-fit:cover; border-radius:4px; background:#aaa; margin-right:0.75em; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.11em;">{{ preset.name }}</span>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.8em;">
          <div class="control is-expanded">
            <input class="input" v-model="presetName" type="text" placeholder="Nom..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePreset">Enregistrer</button>
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deletePreset" :disabled="!presetName">Supprimer</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="activeTab === 'palettes'">
      <div class="mb-3">
        <PaletteEditor :color-stops="model.colorStops" />
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 1em;">
        <label style="white-space: nowrap;">Période :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="0" max="1" step="0.001" v-model.number="sliderPalettePeriod" />
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 1em;">
        <label style="white-space: nowrap;">Décalage :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="0" max="1" step="0.001" v-model.number="model.paletteOffset" />
      </div>

      <hr class="section-sep"/>

      <div class="mb-3">
        <label class="label">Palettes enregistrées</label>
        <!-- Dropdown enrichie Bulma -->
        <div class="dropdown" :class="{ 'is-active': showPaletteDropdown }" style="width:100%;">
          <div class="dropdown-trigger" style="width:100%;">
            <button class="button is-fullwidth" @click="showPaletteDropdown = !showPaletteDropdown" aria-haspopup="true" aria-controls="dropdown-menu-palettes" type="button">
              <span style="display:flex; align-items:center; flex-direction:column; gap:0.5em; padding:0.4em 0;">
                <img v-if="currentPaletteThumbnail" :src="currentPaletteThumbnail" alt="miniature" style="height:24px; width:100%; max-width:280px; object-fit:cover; border-radius:3px; background:#888; box-shadow:0 1px 3px rgba(0,0,0,0.2);" />
                <span style="width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; justify-content:center; gap:0.3em;">
                  <span style="flex:1 1 auto; text-align:center;">{{ paletteName || 'Choisir une palette...' }}</span>
                  <span class="icon is-small">
                    <i class="fas fa-angle-down" aria-hidden="true"></i>
                  </span>
                </span>
              </span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu-palettes" role="menu" style="width:100%;">
            <div class="dropdown-content" style="max-height:450px; overflow-y:auto;">
              <a v-for="palette in palettes" :key="palette.name" class="dropdown-item"
                @click.prevent="selectPaletteFromDropdown(palette)"
                :class="{ 'is-active': selectedPalette === palette.name }"
                style="display:flex; flex-direction:column; gap:0.5em; padding:0.75em;">
                <img v-if="palette.thumbnail" :src="palette.thumbnail" alt="miniature"
                  style="height:32px; width:100%; object-fit:cover; border-radius:4px; background:#aaa; box-shadow:0 1px 6px rgba(0,0,0,0.16);"/>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:1.05em; text-align:center;">{{ palette.name }}</span>
              </a>
            </div>
          </div>
        </div>
        <div class="field is-grouped" style="margin-top:0.8em;">
          <div class="control is-expanded">
            <input class="input" v-model="paletteName" type="text" placeholder="Nom..."
              @focus="props.suspendShortcuts && props.suspendShortcuts(true)"
              @blur="props.suspendShortcuts && props.suspendShortcuts(false)"
            />
          </div>
          <div class="control">
            <button class="button is-link is-small" @click="savePalette">Enregistrer</button>
          </div>
          <div class="control">
            <button class="button is-danger is-small" @click="deletePalette" :disabled="!paletteName">Supprimer</button>
          </div>
        </div>
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
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activateSmoothness" />
          &nbsp;Smoothness
        </label>
      </div>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activateZebra" />
          &nbsp;Zebra
        </label>
      </div>
      <hr class="section-sep"/>
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" v-model="model.activateMotionBlur" />
          &nbsp;Motion Blur
        </label>
      </div>
      <div class="field">
        <label class="label">Motion Blur Strength</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0" max="1" step="0.05" v-model.number="model.motionBlurStrength" :disabled="!model.activateMotionBlur" />
        </div>
        <span>{{ model.motionBlurStrength.toFixed(2) }}</span>
      </div>
      <div class="field">
        <label class="label">Motion Blur Samples</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="4" max="32" step="1" v-model.number="model.motionBlurSamples" :disabled="!model.activateMotionBlur" />
        </div>
        <span>{{ model.motionBlurSamples }}</span>
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
  display: flex;
  flex-direction: column;
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
.preview-mandelbrot-thumb img {
  margin-top: 0.1em;
  margin-bottom: 0.1em;
  border: 1px solid #bbb;
}
.section-sep {
  border: none;
  border-top: 1.5px solid #AAA;
  margin: 1.2em 0 1.2em 0;
}
.tab-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-right: 0.5em;
  min-height: 0;
}
</style>