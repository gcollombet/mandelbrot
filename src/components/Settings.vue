<script setup lang="ts">
import {computed, onMounted, ref, toRaw, watch} from 'vue';
import type {MandelbrotParams} from "../Mandelbrot.ts";
import PaletteEditor from './PaletteEditor.vue';
import { Palette } from '../Palette.ts';
import { lch as d3lch, rgb as d3rgb, hsl as d3hsl } from 'd3-color';
import type { InterpolationMode } from '../Mandelbrot.ts';
import defaultPresetsJson from '../assets/default-presets.json';
import defaultPalettesJson from '../assets/default-palettes.json';

import type { Engine } from '../Engine.ts';
const props = defineProps<{
  engine: Engine | null;
  suspendShortcuts?: (suspend: boolean) => void;
  activeTab: string;
}>();
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
    activateAnimate: false,
    dprMultiplier: 1.0,
    maxIterationMultiplier: 1.0,
    interpolationMode: 'lab',
  }
});


const angleDeg = computed(() => (((model.value.angle * 180 / Math.PI) % 360 + 360) % 360).toFixed(2));
// Slider rotation : angle en ° mod 360 (wrapping)
const angleSlider = computed({
  get: () => (((model.value.angle * 180 / Math.PI) % 360 + 360) % 360),
  set: (deg: number) => {
    // [0, 360) vers radian
    model.value.angle = (deg % 360) * Math.PI / 180;
  },
});
// Slider palette period : logarithmique, 0–1 ↔ 1–100
const sliderPalettePeriod = computed({
  get: () => (Math.log10(model.value.palettePeriod || 0.01) + 2) / 5,
  set: val => {
    model.value.palettePeriod = Number((10 ** (val * 5 - 2)).toPrecision(6));
  }
});
// Slider log2(scale) : valeurs de slider 1 à 126 —> scale de 2^-1 à 2^-126
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

function generatePaletteThumbnail(colorStops: any[], mode: InterpolationMode = 'lab'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (colorStops.length === 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  const palette = new Palette(colorStops, mode);
  const imageData = palette.generateTexture();

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = 1;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return '';
  tempCtx.putImageData(imageData, 0, 0);
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
      return;
    } catch {}
  }
  // Bootstrap from bundled defaults when localStorage is empty
  if (defaultPresetsJson.length > 0) {
    presets.value = structuredClone(defaultPresetsJson) as typeof presets.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value));
  }
}

function loadPalettes() {
  const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
  if (raw) {
    try {
      palettes.value = JSON.parse(raw);
      return;
    } catch {}
  }
  // Bootstrap from bundled defaults when localStorage is empty
  if (defaultPalettesJson.length > 0) {
    palettes.value = structuredClone(defaultPalettesJson) as typeof palettes.value;
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
  }
}

async function savePalette() {
  if (!paletteName.value.trim()) return;
  let thumbnail: string | undefined = undefined;
  let now = new Date().toISOString();
  try {
    thumbnail = generatePaletteThumbnail(model.value.colorStops, model.value.interpolationMode);
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
    presetName.value = preset.name;
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
// Slider max iteration multiplier : logarithmique, 0.1–10
const maxIterMultSlider = computed({
  get: () => Math.log10(model.value.maxIterationMultiplier ?? 1.0),
  set: (val: number) => {
    model.value.maxIterationMultiplier = Number(Math.pow(10, val).toPrecision(3));
  }
});

onMounted(() => {
  loadPresets();
  loadPalettes();
});

const currentPaletteObj = computed(() => palettes.value.find(p => p.name === selectedPalette.value));
const currentPaletteThumbnail = computed(() => currentPaletteObj.value?.thumbnail);

watch([() => props.activeTab, () => props.engine], async ([tab]) => {
  if (tab === 'navigation') {
    await refreshNavigationPreview();
  }
}, { immediate: true });

// =====================================================
// Import / Export Presets
// =====================================================
function exportPresets() {
  const data = JSON.stringify(presets.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mandelbrot-presets.json';
  a.click();
  URL.revokeObjectURL(url);
}

const presetFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPresets() {
  presetFileInput.value?.click();
}
function importPresets(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result as string);
      if (Array.isArray(imported)) {
        // Merge: ajoute les nouveaux, écrase ceux de même nom
        for (const preset of imported) {
          if (!preset.name || !preset.value) continue;
          const idx = presets.value.findIndex(p => p.name === preset.name);
          if (idx >= 0) {
            presets.value[idx] = preset;
          } else {
            presets.value.push(preset);
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.value));
      }
    } catch {
      window.alert('Format de fichier invalide.');
    }
  };
  reader.readAsText(file);
  // Reset pour pouvoir réimporter le même fichier
  input.value = '';
}

// =====================================================
// Import / Export Palettes
// =====================================================
function exportPalettes() {
  const data = JSON.stringify(palettes.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mandelbrot-palettes.json';
  a.click();
  URL.revokeObjectURL(url);
}

const paletteFileInput = ref<HTMLInputElement | null>(null);
function triggerImportPalettes() {
  paletteFileInput.value?.click();
}
function importPalettes(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result as string);
      if (Array.isArray(imported)) {
        for (const palette of imported) {
          if (!palette.name || !palette.colorStops) continue;
          const idx = palettes.value.findIndex(p => p.name === palette.name);
          if (idx >= 0) {
            palettes.value[idx] = palette;
          } else {
            palettes.value.push(palette);
          }
        }
        localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(palettes.value));
      }
    } catch {
      window.alert('Format de fichier invalide.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// =====================================================
// LCH Global Adjustment Sliders (perceptually uniform)
// =====================================================
// Stores the baseline colorStops for LCH adjustments
const lchBaseStops = ref<{ color: string, position: number }[] | null>(null);
const hueShift = ref(0);    // Hue rotation in degrees (-180..180)
const chromaShift = ref(0);  // Chroma shift (-100..100)
const lightShift = ref(0);   // Lightness shift (-100..100)
const satShift = ref(0);     // HSL saturation shift (-100..100)
const lumShift = ref(0);     // HSL luminosity shift (-100..100)
const hslHueShift = ref(0); // HSL hue shift in degrees (-180..180)

// When user starts adjusting, save the current stops as baseline
function ensureLchBase() {
  if (lchBaseStops.value === null) {
    lchBaseStops.value = structuredClone(toRaw(model.value.colorStops));
  }
}

function resetLchBase() {
  lchBaseStops.value = null;
  hueShift.value = 0;
  chromaShift.value = 0;
  lightShift.value = 0;
  satShift.value = 0;
  lumShift.value = 0;
  hslHueShift.value = 0;
}

function onHueInput(val: number) {
  ensureLchBase();
  hueShift.value = val;
  applyAllShifts();
}

function onChromaInput(val: number) {
  ensureLchBase();
  chromaShift.value = val;
  applyAllShifts();
}

function onLightInput(val: number) {
  ensureLchBase();
  lightShift.value = val;
  applyAllShifts();
}

function applyAllShifts() {
  if (!lchBaseStops.value) return;
  model.value.colorStops = lchBaseStops.value.map(stop => {
    const rgbC = d3rgb(stop.color);
    if (rgbC === null || rgbC === undefined) return { ...stop };

    // Apply LCH shifts first
    const lch = d3lch(rgbC);
    const baseL = isNaN(lch.l) ? 0 : lch.l;
    const baseC = isNaN(lch.c) ? 0 : lch.c;
    const baseH = isNaN(lch.h) ? 0 : lch.h;
    let l = baseL + lightShift.value;
    l = Math.max(0, Math.min(150, l));
    let c = baseC + chromaShift.value;
    c = Math.max(0, c);
    let h = baseH + hueShift.value;
    h = ((h % 360) + 360) % 360;
    // If original was achromatic and no chroma is being added, keep hue undefined
    // to avoid pulling grays toward a specific hue
    const afterLch = d3rgb(d3lch(l, c, (c === 0) ? NaN : h));

    // Apply HSL shifts on the result
    const hslC = d3hsl(afterLch);
    const baseHslH = isNaN(hslC.h) ? 0 : hslC.h;
    const baseHslS = isNaN(hslC.s) ? 0 : hslC.s;
    const baseHslL = isNaN(hslC.l) ? 0 : hslC.l;
    let hslH = baseHslH + hslHueShift.value;
    hslH = ((hslH % 360) + 360) % 360;
    let sat = baseHslS + satShift.value / 100;
    sat = Math.max(0, Math.min(1, sat));
    let lum = baseHslL + lumShift.value / 100;
    lum = Math.max(0, Math.min(1, lum));
    // If resulting saturation is zero, keep hue undefined to avoid color artifacts
    const finalH = (sat === 0) ? NaN : hslH;
    const final = d3hsl(finalH, sat, lum);
    return { color: d3rgb(final).formatHex(), position: stop.position };
  });
}

function onSatInput(val: number) {
  ensureLchBase();
  satShift.value = val;
  applyAllShifts();
}

function onLumInput(val: number) {
  ensureLchBase();
  lumShift.value = val;
  applyAllShifts();
}

function onHslHueInput(val: number) {
  ensureLchBase();
  hslHueShift.value = val;
  applyAllShifts();
}

// =====================================================
// Interpolation Modes
// =====================================================
const interpolationModes: { key: InterpolationMode; label: string }[] = [
  { key: 'lab', label: 'Lab' },
  { key: 'rgb', label: 'RGB' },
  { key: 'hcl', label: 'HCL' },
  { key: 'hsl', label: 'HSL' },
  { key: 'cubehelix', label: 'Cubehelix' },
];

// =====================================================
// Palette Manipulation Tools
// =====================================================

/** Inverser : reverse stop order (position 0→1 becomes 1→0) */
function invertPalette() {
  if (model.value.colorStops.length === 0) return;
  model.value.colorStops = model.value.colorStops.map(s => ({
    color: s.color,
    position: 1 - s.position,
  })).sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Dupliquer : compress palette to first half and repeat it in the second half */
function duplicatePalette() {
  if (model.value.colorStops.length === 0) return;
  const first = model.value.colorStops.map(s => ({
    color: s.color,
    position: s.position * 0.5,
  }));
  const second = model.value.colorStops.map(s => ({
    color: s.color,
    position: 0.5 + s.position * 0.5,
  }));
  model.value.colorStops = [...first, ...second].sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Miroir : palette goes 0→0.5 then mirrors back 0.5→1 (palindrome) */
function mirrorPalette() {
  if (model.value.colorStops.length === 0) return;
  const first = model.value.colorStops.map(s => ({
    color: s.color,
    position: s.position * 0.5,
  }));
  const second = model.value.colorStops.map(s => ({
    color: s.color,
    position: 1 - s.position * 0.5,
  }));
  model.value.colorStops = [...first, ...second].sort((a, b) => a.position - b.position);
  resetLchBase();
}

/** Distribuer : space all stops evenly across [0, 1] while keeping color order */
function distributeEvenly() {
  const stops = model.value.colorStops.slice().sort((a, b) => a.position - b.position);
  if (stops.length < 2) return;
  const step = 1 / (stops.length - 1);
  model.value.colorStops = stops.map((s, i) => ({
    color: s.color,
    position: Number((i * step).toFixed(6)),
  }));
  resetLchBase();
}

/** Négatif : invert each color to its RGB complement */
function negatePalette() {
  if (model.value.colorStops.length === 0) return;
  model.value.colorStops = model.value.colorStops.map(s => {
    const c = d3rgb(s.color);
    const inv = d3rgb(255 - (c.r || 0), 255 - (c.g || 0), 255 - (c.b || 0));
    return { color: inv.formatHex(), position: s.position };
  });
  resetLchBase();
}

// =====================================================
// Palette Construction Helper Tools
// =====================================================

/** Generate a monochromatic palette from a base color */
function generateMonochromatic() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h = base.h || 0;
  const c = base.c || 50;
  const stops: { color: string; position: number }[] = [];
  const count = 5;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const l = 15 + t * 85; // lightness from 15 to 100
    const col = d3lch(l, c * (0.5 + 0.5 * Math.sin(t * Math.PI)), h);
    stops.push({ color: d3rgb(col).formatHex(), position: t });
  }
  model.value.colorStops = stops;
  resetLchBase();
}

/** Generate a complementary palette (base + opposite hue) */
function generateComplementary() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h1 = base.h || 0;
  const h2 = (h1 + 180) % 360;
  const c = base.c || 60;
  model.value.colorStops = [
    { color: d3rgb(d3lch(25, c, h1)).formatHex(), position: 0 },
    { color: d3rgb(d3lch(60, c, h1)).formatHex(), position: 0.25 },
    { color: d3rgb(d3lch(90, c * 0.3, h1)).formatHex(), position: 0.5 },
    { color: d3rgb(d3lch(60, c, h2)).formatHex(), position: 0.75 },
    { color: d3rgb(d3lch(25, c, h2)).formatHex(), position: 1.0 },
  ];
  resetLchBase();
}

/** Generate an analogous palette (adjacent hues) */
function generateAnalogous() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h = base.h || 0;
  const c = base.c || 60;
  const spread = 60; // total hue range
  const count = 6;
  const stops: { color: string; position: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const hue = ((h - spread / 2 + t * spread) % 360 + 360) % 360;
    const l = 30 + t * 55;
    stops.push({ color: d3rgb(d3lch(l, c, hue)).formatHex(), position: t });
  }
  model.value.colorStops = stops;
  resetLchBase();
}

/** Generate a triadic palette (3 hues 120° apart) */
function generateTriadic() {
  const base = d3lch(d3rgb(model.value.colorStops[0]?.color || '#3273dc'));
  const h = base.h || 0;
  const c = base.c || 60;
  model.value.colorStops = [
    { color: d3rgb(d3lch(30, c, h)).formatHex(), position: 0 },
    { color: d3rgb(d3lch(70, c, h)).formatHex(), position: 0.17 },
    { color: d3rgb(d3lch(70, c, (h + 120) % 360)).formatHex(), position: 0.33 },
    { color: d3rgb(d3lch(90, c * 0.3, (h + 180) % 360)).formatHex(), position: 0.5 },
    { color: d3rgb(d3lch(70, c, (h + 240) % 360)).formatHex(), position: 0.67 },
    { color: d3rgb(d3lch(30, c, (h + 240) % 360)).formatHex(), position: 1.0 },
  ];
  resetLchBase();
}

/** Generate a random palette */
function generateRandom() {
  const count = 4 + Math.floor(Math.random() * 4); // 4 to 7 stops
  const stops: { color: string; position: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const h = Math.random() * 360;
    const c = 30 + Math.random() * 80;
    const l = 15 + Math.random() * 80;
    stops.push({ color: d3rgb(d3lch(l, c, h)).formatHex(), position: t });
  }
  model.value.colorStops = stops;
  resetLchBase();
}

</script>

<template>
  <div style="color: black !important;">
    <!-- Navigation tab -->
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

    <!-- Presets tab -->
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

        <!-- Import / Export Presets -->
        <hr class="section-sep"/>
        <label class="label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPresets" :disabled="presets.length === 0">
              Exporter
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPresets">
              Importer
            </button>
            <input ref="presetFileInput" type="file" accept=".json" style="display:none;" @change="importPresets" />
          </div>
        </div>
      </div>
    </div>

    <!-- Palettes tab -->
    <div v-else-if="activeTab === 'palettes'">
      <div class="mb-3">
        <PaletteEditor :color-stops="model.colorStops" :interpolation-mode="model.interpolationMode" />
      </div>

      <!-- Interpolation mode -->
      <div class="mb-3">
        <label class="label">Interpolation</label>
        <div class="buttons toggle-buttons">
          <button
            v-for="mode in interpolationModes"
            :key="mode.key"
            class="button is-small"
            :class="model.interpolationMode === mode.key ? 'is-link' : 'is-light'"
            @click="model.interpolationMode = mode.key"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <hr class="section-sep"/>

      <!-- Palette manipulation tools -->
      <div class="mb-3">
        <label class="label">Outils palette</label>
        <div class="buttons" style="flex-wrap: wrap; gap: 0.4em;">
          <button class="button is-small is-light" @click="invertPalette" title="Inverser l'ordre des couleurs">Inverser</button>
          <button class="button is-small is-light" @click="negatePalette" title="Négatif (inverser les couleurs RGB)">Négatif</button>
          <button class="button is-small is-light" @click="duplicatePalette" title="Comprimer et répéter 2x">Dupliquer</button>
          <button class="button is-small is-light" @click="mirrorPalette" title="Effet miroir (palindrome)">Miroir</button>
          <button class="button is-small is-light" @click="distributeEvenly" title="Répartir les stops uniformément">Distribuer</button>
        </div>
      </div>

      <hr class="section-sep"/>

      <!-- Palette construction helpers -->
      <div class="mb-3">
        <label class="label">Générer une palette</label>
        <p style="font-size: 0.85em; color: #555; margin-bottom: 0.5em;">Basé sur la 1ère couleur actuelle</p>
        <div class="buttons" style="flex-wrap: wrap; gap: 0.4em;">
          <button class="button is-small is-info is-light" @click="generateMonochromatic">Monochromatique</button>
          <button class="button is-small is-info is-light" @click="generateComplementary">Complémentaire</button>
          <button class="button is-small is-info is-light" @click="generateAnalogous">Analogique</button>
          <button class="button is-small is-info is-light" @click="generateTriadic">Triadique</button>
          <button class="button is-small is-warning is-light" @click="generateRandom">Aléatoire</button>
        </div>
      </div>

      <hr class="section-sep"/>
      <div class="mb-3" style="display: flex; align-items: center; gap: 1em;">
        <label style="white-space: nowrap;">Période :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="0" max="1" step="0.001" v-model.number="sliderPalettePeriod" />
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 1em;">
        <label style="white-space: nowrap;">Décalage :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="0" max="1" step="0.001" v-model.number="model.paletteOffset" />
      </div>

      <hr class="section-sep"/>

      <!-- Global color adjustment sliders -->
      <label class="label">Ajustement global</label>

      <!-- LCH sliders -->
      <p style="font-size: 0.82em; color: #666; margin-bottom: 0.4em; font-weight: 600;">LCH (perceptuel)</p>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Teinte :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-180" max="180" step="1"
          :value="hueShift"
          @input="onHueInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ hueShift }}°</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Chroma :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="chromaShift"
          @input="onChromaInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ chromaShift }}</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Clarté :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="lightShift"
          @input="onLightInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ lightShift }}</span>
      </div>

      <!-- HSL sliders -->
      <p style="font-size: 0.82em; color: #666; margin-bottom: 0.4em; margin-top: 0.6em; font-weight: 600;">HSL (classique)</p>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Teinte :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-180" max="180" step="1"
          :value="hslHueShift"
          @input="onHslHueInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ hslHueShift }}°</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Saturation :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="satShift"
          @input="onSatInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ satShift }}</span>
      </div>
      <div class="mb-3" style="display: flex; align-items: center; gap: 0.8em;">
        <label style="white-space: nowrap; min-width: 5.5em;">Luminosité :</label>
        <input class="slider is-fullwidth" style="flex: 2 1 90px; min-width: 75px; margin: 0 0.5em;" type="range" min="-100" max="100" step="1"
          :value="lumShift"
          @input="onLumInput(Number(($event.target as HTMLInputElement).value))" />
        <span style="font-family: monospace; min-width: 3.5em; text-align: right;">{{ lumShift }}</span>
      </div>

      <div class="mb-3">
        <button class="button is-small is-light" @click="resetLchBase">Réinitialiser</button>
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

        <!-- Import / Export Palettes -->
        <hr class="section-sep"/>
        <label class="label">Import / Export</label>
        <div class="field is-grouped">
          <div class="control">
            <button class="button is-info is-small" @click="exportPalettes" :disabled="palettes.length === 0">
              Exporter
            </button>
          </div>
          <div class="control">
            <button class="button is-warning is-small" @click="triggerImportPalettes">
              Importer
            </button>
            <input ref="paletteFileInput" type="file" accept=".json" style="display:none;" @change="importPalettes" />
          </div>
        </div>
      </div>
    </div>

    <!-- Performance/Graphics tab -->
    <div v-else-if="activeTab === 'performance'">
      <div class="field">
        <label class="label">Mu</label>
        <div class="control" style="display: flex; align-items: center; gap: 0.5em;">
          <input class="slider is-fullwidth" style="flex: 1;" type="range" min="0" max="5" step="0.01" v-model="muSlider" />
          <button class="button is-small is-light" @click="model.mu = 4" title="Mu = 4">4</button>
        </div>
        <span>{{ (model.mu ?? 1.0).toFixed(1) }}</span>
      </div>
      <div class="field">
        <label class="label">Epsilon</label>
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
        <label class="label">Options de rendu</label>
        <div class="buttons toggle-buttons">
          <button class="button is-small"
            :class="model.activateShading ? 'is-link' : 'is-light'"
            @click="model.activateShading = !model.activateShading">
            Shading
          </button>
          <button class="button is-small"
            :class="model.activatePalette ? 'is-link' : 'is-light'"
            @click="model.activatePalette = !model.activatePalette">
            Palette
          </button>
          <button class="button is-small"
            :class="model.activateSmoothness ? 'is-link' : 'is-light'"
            @click="model.activateSmoothness = !model.activateSmoothness">
            Smoothness
          </button>
          <button class="button is-small"
            :class="model.activateTessellation ? 'is-link' : 'is-light'"
            @click="model.activateTessellation = !model.activateTessellation">
            Tessellation
          </button>
          <button class="button is-small"
            :class="model.activateSkybox ? 'is-link' : 'is-light'"
            @click="model.activateSkybox = !model.activateSkybox">
            Skybox
          </button>
          <button class="button is-small"
            :class="model.activateWebcam ? 'is-link' : 'is-light'"
            @click="model.activateWebcam = !model.activateWebcam">
            Webcam
          </button>
          <button class="button is-small"
            :class="model.activateZebra ? 'is-link' : 'is-light'"
            @click="model.activateZebra = !model.activateZebra">
            Zebra
          </button>
          <button class="button is-small"
            :class="model.activateAnimate ? 'is-link' : 'is-light'"
            @click="model.activateAnimate = !model.activateAnimate">
            Animate
          </button>
        </div>
      </div>
      <div class="field">
        <label class="label">R&eacute;solution (DPR &times; {{ model.dprMultiplier?.toFixed(3) ?? '1.000' }})</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="0.125" max="2" step="0.125" v-model.number="model.dprMultiplier" />
        </div>
      </div>
      <div class="field">
        <label class="label">It&eacute;rations (&times; {{ (model.maxIterationMultiplier ?? 1.0).toPrecision(3) }})</label>
        <div class="control">
          <input class="slider is-fullwidth" type="range" min="-2" max="1" step="0.01" v-model="maxIterMultSlider" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
.toggle-buttons {
  flex-wrap: wrap;
  gap: 0.4em;
}
.toggle-buttons .button {
  margin-bottom: 0 !important;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}
</style>
